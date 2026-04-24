<?php
declare(strict_types=1);

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

$loginUser = function (Request $request, Response $response) use ($db, $jwtConfig): Response {
    $data = $request->getParsedBody() ?? [];
    $username = trim($data['username'] ?? '');
    $password = $data['password'] ?? '';

    if (!$username || !$password) {
        $response->getBody()->write(json_encode(['error' => 'Username and password are required']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }

    $stmt = $db->prepare('SELECT * FROM tt_user WHERE username = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['userpassword'])) {
        $response->getBody()->write(json_encode(['error' => 'Invalid credentials']));
        return $response->withStatus(401)->withHeader('Content-Type', 'application/json');
    }

    $db->prepare('UPDATE tt_user SET last_login = NOW() WHERE id = ?')->execute([$user['id']]);

    $now = new DateTimeImmutable();
    $token = $jwtConfig->builder()
        ->issuedBy('timetracker')
        ->issuedAt($now)
        ->expiresAt($now->modify('+24 hours'))
        ->withClaim('uid', $user['id'])
        ->getToken($jwtConfig->signer(), $jwtConfig->signingKey());

    $result = [
        'token' => $token->toString(),
        'user' => [
            'id' => (int)$user['id'],
            'username' => $user['username'],
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
            'email_address' => $user['email_address'],
            'is_admin' => (int)$user['is_admin'],
        ],
    ];

    $response->getBody()->write(json_encode($result));
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withHeader('Set-Cookie', 'tt_auth=' . $token->toString() . '; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400');
};

$listUsers = function (Request $request, Response $response) use ($db): Response {
    $stmt = $db->query('SELECT id, username, email_address, first_name, last_name, country, confirmed, is_admin, registered, last_login FROM tt_user ORDER BY last_name, first_name');
    $users = $stmt->fetchAll();
    $response->getBody()->write(json_encode($users));
    return $response->withHeader('Content-Type', 'application/json');
};

$createUser = function (Request $request, Response $response) use ($db): Response {
    $data = $request->getParsedBody() ?? [];

    foreach (['username', 'password', 'email_address'] as $field) {
        if (empty($data[$field])) {
            $response->getBody()->write(json_encode(['error' => "Field '{$field}' is required"]));
            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
        }
    }

    $hash = password_hash($data['password'], PASSWORD_DEFAULT);
    $stmt = $db->prepare(
        'INSERT INTO tt_user (username, userpassword, email_address, first_name, last_name, country, is_admin, confirmed, registered, last_login)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())'
    );
    $stmt->execute([
        $data['username'],
        $hash,
        $data['email_address'],
        $data['first_name'] ?? '',
        $data['last_name'] ?? '',
        $data['country'] ?? '',
        (int)($data['is_admin'] ?? 0),
    ]);

    $response->getBody()->write(json_encode(['id' => (int)$db->lastInsertId(), 'message' => 'User created']));
    return $response->withStatus(201)->withHeader('Content-Type', 'application/json');
};

$getUser = function (Request $request, Response $response, array $args) use ($db): Response {
    $stmt = $db->prepare('SELECT id, username, email_address, first_name, last_name, country, confirmed, is_admin, registered, last_login FROM tt_user WHERE id = ?');
    $stmt->execute([$args['id']]);
    $user = $stmt->fetch();

    if (!$user) {
        $response->getBody()->write(json_encode(['error' => 'User not found']));
        return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
    }

    $response->getBody()->write(json_encode($user));
    return $response->withHeader('Content-Type', 'application/json');
};

$updateUser = function (Request $request, Response $response, array $args) use ($db): Response {
    $data = $request->getParsedBody() ?? [];
    $fields = [];
    $values = [];

    foreach (['email_address', 'first_name', 'last_name', 'country', 'is_admin'] as $field) {
        if (array_key_exists($field, $data)) {
            $fields[] = "{$field} = ?";
            $values[] = $data[$field];
        }
    }

    if (!empty($data['password'])) {
        $fields[] = 'userpassword = ?';
        $values[] = password_hash($data['password'], PASSWORD_DEFAULT);
    }

    if (empty($fields)) {
        $response->getBody()->write(json_encode(['error' => 'No fields to update']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }

    $values[] = $args['id'];
    $db->prepare('UPDATE tt_user SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($values);

    $response->getBody()->write(json_encode(['message' => 'User updated']));
    return $response->withHeader('Content-Type', 'application/json');
};

$deleteUser = function (Request $request, Response $response, array $args) use ($db): Response {
    $db->prepare('DELETE FROM tt_user WHERE id = ?')->execute([$args['id']]);
    $response->getBody()->write(json_encode(['message' => 'User deleted']));
    return $response->withHeader('Content-Type', 'application/json');
};
