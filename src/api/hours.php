<?php
declare(strict_types=1);

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

$listTimeRecords = function (Request $request, Response $response) use ($db): Response {
    $params = $request->getQueryParams();
    $where = [];
    $values = [];

    if (!empty($params['date'])) {
        $where[] = 'DATE(work_date) = ?';
        $values[] = $params['date'];
    }
    if (!empty($params['client_id'])) {
        $where[] = 'client_id = ?';
        $values[] = $params['client_id'];
    }
    if (!empty($params['project_id'])) {
        $where[] = 'project_id = ?';
        $values[] = $params['project_id'];
    }

    $sql = 'SELECT r.*, c.name AS client_name, c.color, p.name AS project_name
             FROM tt_time_record r
             LEFT JOIN tt_client c ON c.id = r.client_id
             LEFT JOIN tt_client_project p ON p.id = r.project_id';
    $sql .= $where ? ' WHERE ' . implode(' AND ', $where) : '';
    $sql .= ' ORDER BY work_date ASC';

    $stmt = $db->prepare($sql);
    $stmt->execute($values);
    $records = $stmt->fetchAll();

    $response->getBody()->write(json_encode($records));
    return $response->withHeader('Content-Type', 'application/json');
};

$createTimeRecord = function (Request $request, Response $response) use ($db): Response {
    $data = $request->getParsedBody() ?? [];

    foreach (['client_id', 'work_date', 'num_hours'] as $field) {
        if (empty($data[$field])) {
            $response->getBody()->write(json_encode(['error' => "Field '{$field}' is required"]));
            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
        }
    }

    $stmt = $db->prepare(
        'INSERT INTO tt_time_record (client_id, project_id, work_desc, work_date, num_hours, created, modified)
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())'
    );
    $stmt->execute([
        $data['client_id'],
        $data['project_id'] ?? null,
        $data['work_desc'] ?? '',
        $data['work_date'],
        $data['num_hours'],
    ]);

    $id = (int)$db->lastInsertId();
    $response->getBody()->write(json_encode(['id' => $id, 'message' => 'Time record created']));
    return $response->withStatus(201)->withHeader('Content-Type', 'application/json');
};

$getTimeRecord = function (Request $request, Response $response, array $args) use ($db): Response {
    $stmt = $db->prepare(
        'SELECT r.*, c.name AS client_name, p.name AS project_name
         FROM tt_time_record r
         LEFT JOIN tt_client c ON c.id = r.client_id
         LEFT JOIN tt_client_project p ON p.id = r.project_id
         WHERE r.id = ?'
    );
    $stmt->execute([$args['id']]);
    $record = $stmt->fetch();

    if (!$record) {
        $response->getBody()->write(json_encode(['error' => 'Time record not found']));
        return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
    }

    $response->getBody()->write(json_encode($record));
    return $response->withHeader('Content-Type', 'application/json');
};

$updateTimeRecord = function (Request $request, Response $response, array $args) use ($db): Response {
    $data = $request->getParsedBody() ?? [];
    $fields = ['modified = NOW()'];
    $values = [];

    foreach (['client_id', 'project_id', 'work_desc', 'work_date', 'num_hours'] as $field) {
        if (array_key_exists($field, $data)) {
            $fields[] = "{$field} = ?";
            $values[] = $data[$field];
        }
    }

    $values[] = $args['id'];
    $db->prepare('UPDATE tt_time_record SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($values);

    $response->getBody()->write(json_encode(['message' => 'Time record updated']));
    return $response->withHeader('Content-Type', 'application/json');
};

$deleteTimeRecord = function (Request $request, Response $response, array $args) use ($db): Response {
    $db->prepare('DELETE FROM tt_time_record WHERE id = ?')->execute([$args['id']]);
    $response->getBody()->write(json_encode(['message' => 'Time record deleted']));
    return $response->withHeader('Content-Type', 'application/json');
};

$deleteTimeRecordsByDate = function (Request $request, Response $response) use ($db): Response {
    $date = $request->getQueryParams()['date'] ?? null;

    if (!$date) {
        $response->getBody()->write(json_encode(['error' => "'date' parameter is required"]));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }

    $db->prepare('DELETE FROM tt_time_record WHERE DATE(work_date) = ?')->execute([$date]);
    $response->getBody()->write(json_encode(['message' => 'Time records deleted']));
    return $response->withHeader('Content-Type', 'application/json');
};

$getMonthlySummary = function (Request $request, Response $response) use ($db): Response {
    $params = $request->getQueryParams();
    $month = $params['month'] ?? date('Y-m');

    $stmt = $db->prepare(
        "SELECT r.client_id, c.name AS client_name, c.color,
                SUM(r.num_hours) AS total_hours,
                SUM(r.num_hours * CASE WHEN p.bill_rate > 0 THEN p.bill_rate ELSE c.bill_rate END) AS total_billings
         FROM tt_time_record r
         LEFT JOIN tt_client c ON c.id = r.client_id
         LEFT JOIN tt_client_project p ON p.id = r.project_id
         WHERE DATE_FORMAT(r.work_date, '%Y-%m') = ?
         GROUP BY r.client_id, c.name
         ORDER BY c.name ASC"
    );
    $stmt->execute([$month]);
    $response->getBody()->write(json_encode($stmt->fetchAll()));
    return $response->withHeader('Content-Type', 'application/json');
};

$getHoursSummary = function (Request $request, Response $response) use ($db): Response {
    $params = $request->getQueryParams();
    $month = $params['month'] ?? date('Y-m');

    $stmt = $db->prepare(
        "SELECT DATE(work_date) AS date, r.client_id, c.name AS client_name, c.color, SUM(r.num_hours) AS total_hours
         FROM tt_time_record r
         LEFT JOIN tt_client c ON c.id = r.client_id
         WHERE DATE_FORMAT(work_date, '%Y-%m') = ?
         GROUP BY DATE(work_date), r.client_id
         ORDER BY DATE(work_date) ASC, c.name ASC"
    );
    $stmt->execute([$month]);
    $response->getBody()->write(json_encode($stmt->fetchAll()));
    return $response->withHeader('Content-Type', 'application/json');
};
