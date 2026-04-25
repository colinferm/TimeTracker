<?php
declare(strict_types=1);

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

$listClients = function (Request $request, Response $response) use ($db): Response {
    $clients = $db->query("SELECT id, name, primary_contact, address_1, address_2, city, state_province, postal_code, country, bill_rate, invoice_services, invoice_line_item, organization_id, DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date, DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date FROM tt_client ORDER BY start_date ASC")->fetchAll();
    $response->getBody()->write(json_encode($clients));
    return $response->withHeader('Content-Type', 'application/json');
};

$createClient = function (Request $request, Response $response) use ($db): Response {
    $data = $request->getParsedBody() ?? [];

    if (empty($data['name'])) {
        $response->getBody()->write(json_encode(['error' => 'Client name is required']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }

    $stmt = $db->prepare(
        'INSERT INTO tt_client
            (name, primary_contact, address_1, address_2, city, state_province, postal_code, country, bill_rate, invoice_services, invoice_line_item, organization_id, start_date, end_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $data['name'],
        $data['primary_contact'] ?? '',
        $data['address_1'] ?? '',
        $data['address_2'] ?? '',
        $data['city'] ?? '',
        $data['state_province'] ?? '',
        $data['postal_code'] ?? '',
        $data['country'] ?? '',
        $data['bill_rate'] ?? 135.00,
        $data['invoice_services'] ?? '',
        $data['invoice_line_item'] ?? '',
        isset($data['organization_id']) ? (int)$data['organization_id'] : null,
        $data['start_date'] ?? date('Y-m-d H:i:s'),
        $data['end_date'] ?? null,
    ]);

    $id = (int)$db->lastInsertId();
    $response->getBody()->write(json_encode(['id' => $id, 'message' => 'Client created']));
    return $response->withStatus(201)->withHeader('Content-Type', 'application/json');
};

$getClient = function (Request $request, Response $response, array $args) use ($db): Response {
    $stmt = $db->prepare("SELECT id, name, primary_contact, address_1, address_2, city, state_province, postal_code, country, bill_rate, invoice_services, invoice_line_item, organization_id, DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date, DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date FROM tt_client WHERE id = ?");
    $stmt->execute([$args['id']]);
    $client = $stmt->fetch();

    if (!$client) {
        $response->getBody()->write(json_encode(['error' => 'Client not found']));
        return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
    }

    $response->getBody()->write(json_encode($client));
    return $response->withHeader('Content-Type', 'application/json');
};

$updateClient = function (Request $request, Response $response, array $args) use ($db): Response {
    $data = $request->getParsedBody() ?? [];
    $fields = [];
    $values = [];

    foreach (['name', 'primary_contact', 'address_1', 'address_2', 'city',
              'state_province', 'postal_code', 'country', 'bill_rate',
              'invoice_services', 'invoice_line_item', 'organization_id', 'start_date', 'end_date'] as $field) {
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
    $db->prepare('UPDATE tt_client SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($values);

    $response->getBody()->write(json_encode(['message' => 'Client updated']));
    return $response->withHeader('Content-Type', 'application/json');
};

$deleteClient = function (Request $request, Response $response, array $args) use ($db): Response {
    $db->prepare('DELETE FROM tt_client WHERE id = ?')->execute([$args['id']]);
    $response->getBody()->write(json_encode(['message' => 'Client deleted']));
    return $response->withHeader('Content-Type', 'application/json');
};

$listAllProjects = function (Request $request, Response $response) use ($db): Response {
    $projects = $db->query(
        'SELECT p.*, c.name AS client_name
         FROM tt_client_project p
         LEFT JOIN tt_client c ON c.id = p.client_id
         ORDER BY c.name ASC, p.name ASC'
    )->fetchAll();
    $response->getBody()->write(json_encode($projects));
    return $response->withHeader('Content-Type', 'application/json');
};

$createProjectFlat = function (Request $request, Response $response) use ($db): Response {
    $data = $request->getParsedBody() ?? [];

    if (empty($data['name']) || empty($data['client_id'])) {
        $response->getBody()->write(json_encode(['error' => 'Client and project name are required']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }

    $stmt = $db->prepare(
        'INSERT INTO tt_client_project (client_id, name, bill_rate, invoice_line_item, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $data['client_id'],
        $data['name'],
        $data['bill_rate'] ?? 0.00,
        $data['invoice_line_item'] ?? '',
        $data['start_date'] ?? date('Y-m-d H:i:s'),
        $data['end_date'] ?? null,
    ]);

    $id = (int)$db->lastInsertId();
    $response->getBody()->write(json_encode(['id' => $id, 'message' => 'Project created']));
    return $response->withStatus(201)->withHeader('Content-Type', 'application/json');
};

$listClientProjects = function (Request $request, Response $response, array $args) use ($db): Response {
    $stmt = $db->prepare('SELECT * FROM tt_client_project WHERE client_id = ? ORDER BY start_date ASC');
    $stmt->execute([$args['clientId']]);
    $projects = $stmt->fetchAll();
    $response->getBody()->write(json_encode($projects));
    return $response->withHeader('Content-Type', 'application/json');
};

$createClientProject = function (Request $request, Response $response, array $args) use ($db): Response {
    $data = $request->getParsedBody() ?? [];

    if (empty($data['name'])) {
        $response->getBody()->write(json_encode(['error' => 'Project name is required']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }

    $stmt = $db->prepare(
        'INSERT INTO tt_client_project (client_id, name, bill_rate, invoice_line_item, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $args['clientId'],
        $data['name'],
        $data['bill_rate'] ?? 0.00,
        $data['invoice_line_item'] ?? '',
        $data['start_date'] ?? date('Y-m-d H:i:s'),
        $data['end_date'] ?? null,
    ]);

    $id = (int)$db->lastInsertId();
    $response->getBody()->write(json_encode(['id' => $id, 'message' => 'Project created']));
    return $response->withStatus(201)->withHeader('Content-Type', 'application/json');
};

$getProject = function (Request $request, Response $response, array $args) use ($db): Response {
    $stmt = $db->prepare('SELECT * FROM tt_client_project WHERE id = ?');
    $stmt->execute([$args['id']]);
    $project = $stmt->fetch();

    if (!$project) {
        $response->getBody()->write(json_encode(['error' => 'Project not found']));
        return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
    }

    $response->getBody()->write(json_encode($project));
    return $response->withHeader('Content-Type', 'application/json');
};

$updateProject = function (Request $request, Response $response, array $args) use ($db): Response {
    $data = $request->getParsedBody() ?? [];
    $fields = [];
    $values = [];

    $updatable = ['client_id', 'name', 'bill_rate', 'invoice_line_item', 'start_date', 'end_date'];
    foreach ($updatable as $field) {
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
    $db->prepare('UPDATE tt_client_project SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($values);

    $response->getBody()->write(json_encode(['message' => 'Project updated']));
    return $response->withHeader('Content-Type', 'application/json');
};

$deleteProject = function (Request $request, Response $response, array $args) use ($db): Response {
    $db->prepare('DELETE FROM tt_client_project WHERE id = ?')->execute([$args['id']]);
    $response->getBody()->write(json_encode(['message' => 'Project deleted']));
    return $response->withHeader('Content-Type', 'application/json');
};
