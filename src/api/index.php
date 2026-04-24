<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/vendor/autoload.php';

use Slim\Factory\AppFactory;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Lcobucci\JWT\Configuration;
use Lcobucci\JWT\Signer\Hmac\Sha256;
use Lcobucci\JWT\Signer\Key\InMemory;
use Lcobucci\JWT\Validation\Constraint\SignedWith;

// JWT configuration
$jwtSecret = $_ENV['JWT_SECRET'] ?? 'timetracker-secret-key-change-in-production';
$jwtConfig = Configuration::forSymmetricSigner(
    new Sha256(),
    InMemory::plainText($jwtSecret)
);

// Database connection
$db = (function (): PDO {
    $host = getenv('DATABASE_HOST') ?: 'mysql-server';
    $user = getenv('DATABASE_USER') ?: 'timetracker';
    $pass = getenv('DATABASE_PASSWORD') ?: 'timetracker';
    $dsn  = "mysql:host={$host};port=3306;dbname=timetracker;charset=utf8mb4";
    $pdo  = new PDO($dsn, $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    return $pdo;
})();

$app = AppFactory::create();

$app->addBodyParsingMiddleware();
$app->addRoutingMiddleware();
$app->addErrorMiddleware(true, true, true);

// CORS
$app->add(function (Request $request, $handler): Response {
    if ($request->getMethod() === 'OPTIONS') {
        $response = new \Slim\Psr7\Response();
    } else {
        $response = $handler->handle($request);
    }
    return $response
        ->withHeader('Access-Control-Allow-Origin', '*')
        ->withHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Origin, Authorization')
        ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
});

// JWT auth middleware
$authMiddleware = function (Request $request, $handler) use ($jwtConfig): Response {
    $tokenString = null;

    $authHeader = $request->getHeaderLine('Authorization');
    if ($authHeader && preg_match('/Bearer\s+(.+)$/i', $authHeader, $matches)) {
        $tokenString = $matches[1];
    } else {
        $cookies = $request->getCookieParams();
        if (!empty($cookies['tt_auth'])) {
            $tokenString = $cookies['tt_auth'];
        }
    }

    if (!$tokenString) {
        $response = new \Slim\Psr7\Response();
        $response->getBody()->write(json_encode(['error' => 'Unauthorized']));
        return $response->withStatus(401)->withHeader('Content-Type', 'application/json');
    }

    try {
        $token = $jwtConfig->parser()->parse($tokenString);
        $jwtConfig->validator()->assert(
            $token,
            new SignedWith($jwtConfig->signer(), $jwtConfig->signingKey())
        );
        $request = $request->withAttribute('userId', $token->claims()->get('uid'));
    } catch (\Exception $e) {
        $response = new \Slim\Psr7\Response();
        $response->getBody()->write(json_encode(['error' => 'Invalid or expired token']));
        return $response->withStatus(401)->withHeader('Content-Type', 'application/json');
    }

    return $handler->handle($request);
};

// Handler files – define named closure variables used in the routing table below
require_once __DIR__ . '/user.php';
require_once __DIR__ . '/client.php';
require_once __DIR__ . '/hours.php';
require_once __DIR__ . '/exports.php';

$app->setBasePath('/api');
// ─── Auth ─────────────────────────────────────────────────────────────────────
$app->post('/auth/login', $loginUser);

// ─── Users ────────────────────────────────────────────────────────────────────
$app->get('/users', $listUsers)->add($authMiddleware);
$app->post('/users', $createUser)->add($authMiddleware);
$app->get('/users/{id}', $getUser)->add($authMiddleware);
$app->put('/users/{id}', $updateUser)->add($authMiddleware);
$app->delete('/users/{id}', $deleteUser)->add($authMiddleware);

// ─── Clients ──────────────────────────────────────────────────────────────────
$app->get('/clients', $listClients)->add($authMiddleware);
$app->post('/clients', $createClient)->add($authMiddleware);
$app->get('/clients/{id}', $getClient)->add($authMiddleware);
$app->put('/clients/{id}', $updateClient)->add($authMiddleware);
$app->delete('/clients/{id}', $deleteClient)->add($authMiddleware);

// ─── Projects ─────────────────────────────────────────────────────────────────
$app->get('/projects', $listAllProjects)->add($authMiddleware);
$app->post('/projects', $createProjectFlat)->add($authMiddleware);
$app->get('/clients/{clientId}/projects', $listClientProjects)->add($authMiddleware);
$app->post('/clients/{clientId}/projects', $createClientProject)->add($authMiddleware);
$app->get('/projects/{id}', $getProject)->add($authMiddleware);
$app->put('/projects/{id}', $updateProject)->add($authMiddleware);
$app->delete('/projects/{id}', $deleteProject)->add($authMiddleware);

// ─── Hours ────────────────────────────────────────────────────────────────────
$app->get('/hours', $listTimeRecords)->add($authMiddleware);
$app->post('/hours', $createTimeRecord)->add($authMiddleware);
$app->get('/hours/summary', $getHoursSummary)->add($authMiddleware);
$app->get('/hours/monthly-summary', $getMonthlySummary)->add($authMiddleware);
$app->get('/hours/{id}', $getTimeRecord)->add($authMiddleware);
$app->put('/hours/{id}', $updateTimeRecord)->add($authMiddleware);
$app->delete('/hours/{id}', $deleteTimeRecord)->add($authMiddleware);

// ─── Exports ──────────────────────────────────────────────────────────────────
$app->get('/exports/excel', $exportExcel)->add($authMiddleware);
$app->get('/exports/pdf',   $exportPdf)->add($authMiddleware);

// ─── Invoices ─────────────────────────────────────────────────────────────────
$app->get('/exports/invoices', $listInvoices)->add($authMiddleware);
$app->post('/exports/invoice', $createInvoice)->add($authMiddleware);
$app->put('/exports/invoices/{id}', $updateInvoice)->add($authMiddleware);
$app->get('/exports/invoices/{id}/pdf', $generateInvoicePdf)->add($authMiddleware);

$app->run();
