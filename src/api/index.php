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
    $dsn = "mysql:host={$host};port=3306;dbname=timetracker;charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass);
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

// Shared helpers
require_once __DIR__ . '/permissions.php';

// Auth middleware factory — validates JWT, attaches userId + permissions, enforces minimum role
$makeAuthMiddleware = function (string $require = 'any') use ($db, $jwtConfig): callable {
    return function (Request $request, $handler) use ($db, $jwtConfig, $require): Response {
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
            $r = new \Slim\Psr7\Response();
            $r->getBody()->write(json_encode(['error' => 'Unauthorized']));
            return $r->withStatus(401)->withHeader('Content-Type', 'application/json');
        }

        try {
            /** @var \Lcobucci\JWT\Token\Plain $token */
            $token = $jwtConfig->parser()->parse($tokenString);
            $jwtConfig->validator()->assert(
                $token,
                new SignedWith($jwtConfig->signer(), $jwtConfig->signingKey())
            );
            $userId = (int)$token->claims()->get('uid');
        } catch (\Exception) {
            $r = new \Slim\Psr7\Response();
            $r->getBody()->write(json_encode(['error' => 'Invalid or expired token']));
            return $r->withStatus(401)->withHeader('Content-Type', 'application/json');
        }

        $perms = getUserPermissions($db, $userId);

        if ($require === 'superuser' && !$perms['superuser']) {
            $r = new \Slim\Psr7\Response();
            $r->getBody()->write(json_encode(['error' => 'Unauthorized']));
            return $r->withStatus(401)->withHeader('Content-Type', 'application/json');
        }
        if ($require === 'admin' && !$perms['admin'] && !$perms['superuser']) {
            $r = new \Slim\Psr7\Response();
            $r->getBody()->write(json_encode(['error' => 'Unauthorized']));
            return $r->withStatus(401)->withHeader('Content-Type', 'application/json');
        }

        $request = $request->withAttribute('userId', $userId)
                            ->withAttribute('permissions', $perms);
        return $handler->handle($request);
    };
};

$authMiddleware = $makeAuthMiddleware('any');
$adminMiddleware = $makeAuthMiddleware('admin');
$superuserMiddleware = $makeAuthMiddleware('superuser');

// Handler files – define named closure variables used in the routing table below
require_once __DIR__ . '/user.php';
require_once __DIR__ . '/client.php';
require_once __DIR__ . '/hours.php';
require_once __DIR__ . '/exports.php';
require_once __DIR__ . '/organization.php';

$app->setBasePath('/api');

// ─── Auth ─────────────────────────────────────────────────────────────────────
$app->post('/auth/login', $loginUser);

// ─── Users ────────────────────────────────────────────────────────────────────
$app->get('/users', $listUsers)->add($adminMiddleware);
$app->post('/users', $createUser)->add($adminMiddleware);
$app->get('/users/{id}', $getUser)->add($authMiddleware);
$app->put('/users/{id}', $updateUser)->add($authMiddleware);
$app->delete('/users/{id}', $deleteUser)->add($adminMiddleware);

// ─── Clients ──────────────────────────────────────────────────────────────────
$app->get('/clients', $listClients)->add($authMiddleware);
$app->post('/clients', $createClient)->add($adminMiddleware);
$app->get('/clients/{id}', $getClient)->add($authMiddleware);
$app->put('/clients/{id}', $updateClient)->add($adminMiddleware);
$app->delete('/clients/{id}', $deleteClient)->add($adminMiddleware);

// ─── Projects ─────────────────────────────────────────────────────────────────
$app->get('/projects', $listAllProjects)->add($authMiddleware);
$app->post('/projects', $createProjectFlat)->add($adminMiddleware);
$app->get('/clients/{clientId}/projects', $listClientProjects)->add($authMiddleware);
$app->post('/clients/{clientId}/projects', $createClientProject)->add($adminMiddleware);
$app->get('/projects/{id}', $getProject)->add($authMiddleware);
$app->put('/projects/{id}', $updateProject)->add($adminMiddleware);
$app->delete('/projects/{id}', $deleteProject)->add($adminMiddleware);

// ─── Hours ────────────────────────────────────────────────────────────────────
$app->get('/hours', $listTimeRecords)->add($authMiddleware);
$app->post('/hours', $createTimeRecord)->add($authMiddleware);
$app->get('/hours/summary', $getHoursSummary)->add($authMiddleware);
$app->get('/hours/monthly-summary', $getMonthlySummary)->add($authMiddleware);
$app->get('/hours/{id}', $getTimeRecord)->add($authMiddleware);
$app->put('/hours/{id}', $updateTimeRecord)->add($authMiddleware);
$app->delete('/hours/{id}', $deleteTimeRecord)->add($authMiddleware);
$app->delete('/hours', $deleteTimeRecordsByDate)->add($authMiddleware);

// ─── Exports ──────────────────────────────────────────────────────────────────
$app->get('/exports/excel', $exportExcel)->add($authMiddleware);
$app->get('/exports/pdf',   $exportPdf)->add($authMiddleware);

// ─── Invoices ─────────────────────────────────────────────────────────────────
$app->get('/exports/invoices', $listInvoices)->add($authMiddleware);
$app->post('/exports/invoice', $createInvoice)->add($adminMiddleware);
$app->put('/exports/invoices/{id}', $updateInvoice)->add($adminMiddleware);
$app->delete('/exports/invoices/{id}', $deleteInvoice)->add($adminMiddleware);
$app->get('/exports/invoices/{id}/pdf', $generateInvoicePdf)->add($authMiddleware);

// ─── Organizations ─────────────────────────────────────────────────────────────
$app->get('/organizations', $listOrganizations)->add($authMiddleware);
$app->post('/organizations', $createOrganization)->add($superuserMiddleware);
$app->get('/organizations/{id}', $getOrganization)->add($authMiddleware);
$app->put('/organizations/{id}', $updateOrganization)->add($adminMiddleware);
$app->delete('/organizations/{id}', $deleteOrganization)->add($superuserMiddleware);

$app->run();
