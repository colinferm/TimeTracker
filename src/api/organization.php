<?php
declare(strict_types=1);

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

$listOrganizations = function (Request $request, Response $response) use ($db): Response {
    $stmt = $db->query('SELECT id, primary_user_id, name, address_1, address_2, city, state_province, postal_code, country, phone_number FROM tt_organization ORDER BY name');
    $response->getBody()->write(json_encode($stmt->fetchAll()));
    return $response->withHeader('Content-Type', 'application/json');
};

$getOrganization = function (Request $request, Response $response, array $args) use ($db): Response {
    $stmt = $db->prepare('SELECT id, primary_user_id, name, address_1, address_2, city, state_province, postal_code, country, phone_number FROM tt_organization WHERE id = ?');
    $stmt->execute([$args['id']]);
    $org = $stmt->fetch();

    if (!$org) {
        $response->getBody()->write(json_encode(['error' => 'Organization not found']));
        return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
    }

    $response->getBody()->write(json_encode($org));
    return $response->withHeader('Content-Type', 'application/json');
};

$createOrganization = function (Request $request, Response $response) use ($db): Response {
    $data = $request->getParsedBody() ?? [];

    if (empty($data['name'])) {
        $response->getBody()->write(json_encode(['error' => "Field 'name' is required"]));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }

    $stmt = $db->prepare(
        'INSERT INTO tt_organization (primary_user_id, name, address_1, address_2, city, state_province, postal_code, country, phone_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        isset($data['primary_user_id']) ? (int)$data['primary_user_id'] : null,
        $data['name'],
        $data['address_1'] ?? '',
        $data['address_2'] ?? '',
        $data['city'] ?? '',
        $data['state_province'] ?? '',
        $data['postal_code'] ?? '',
        $data['country'] ?? '',
        $data['phone_number'] ?? '',
    ]);

    $response->getBody()->write(json_encode(['id' => (int)$db->lastInsertId(), 'message' => 'Organization created']));
    return $response->withStatus(201)->withHeader('Content-Type', 'application/json');
};

$updateOrganization = function (Request $request, Response $response, array $args) use ($db): Response {
    $data = $request->getParsedBody() ?? [];
    $fields = [];
    $values = [];

    foreach (['primary_user_id', 'name', 'address_1', 'address_2', 'city', 'state_province', 'postal_code', 'country', 'phone_number'] as $field) {
        if (array_key_exists($field, $data)) {
            $fields[] = "{$field} = ?";
            $values[] = $data[$field];
        }
    }

    if (empty($fields)) {
        $response->getBody()->write(json_encode(['error' => 'No fields to update']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }

    $values[] = $args['id'];
    $db->prepare('UPDATE tt_organization SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($values);

    $response->getBody()->write(json_encode(['message' => 'Organization updated']));
    return $response->withHeader('Content-Type', 'application/json');
};

$deleteOrganization = function (Request $request, Response $response, array $args) use ($db): Response {
    $db->prepare('DELETE FROM tt_organization WHERE id = ?')->execute([$args['id']]);
    $response->getBody()->write(json_encode(['message' => 'Organization deleted']));
    return $response->withHeader('Content-Type', 'application/json');
};
