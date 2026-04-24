<?php
declare(strict_types=1);

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

function fetchTimeRecords(PDO $db, array $params): array {
    $where = [];
    $values = [];

    if (!empty($params['client_id'])) {
        $where[] = 'r.client_id = ?';
        $values[] = $params['client_id'];
    }
    if (!empty($params['start'])) {
        $where[] = 'DATE(r.work_date) >= ?';
        $values[] = $params['start'];
    }
    if (!empty($params['end'])) {
        $where[] = 'DATE(r.work_date) <= ?';
        $values[] = $params['end'];
    }

    $sql = 'SELECT r.*, c.name AS client_name, p.name AS project_name
             FROM tt_time_record r
             LEFT JOIN tt_client c ON c.id = r.client_id
             LEFT JOIN tt_client_project p ON p.id = r.project_id';
    $sql .= $where ? ' WHERE ' . implode(' AND ', $where) : '';
    $sql .= ' ORDER BY r.work_date ASC';

    $stmt = $db->prepare($sql);
    $stmt->execute($values);
    return $stmt->fetchAll();
}

$exportExcel = function (Request $request, Response $response) use ($db): Response {
    $params = $request->getQueryParams();
    $rows = fetchTimeRecords($db, $params);

    $spreadsheet = new Spreadsheet();
    $sheet = $spreadsheet->getActiveSheet();
    $sheet->setTitle('Time Records');

    $headers = ['ID', 'Client', 'Project', 'Description', 'Date', 'Hours'];
    foreach ($headers as $col => $heading) {
        $sheet->setCellValueByColumnAndRow($col + 1, 1, $heading);
        $sheet->getColumnDimensionByColumn($col + 1)->setAutoSize(true);
    }
    $sheet->getStyle('A1:F1')->getFont()->setBold(true);

    $row = 2;
    foreach ($rows as $record) {
        $sheet->setCellValueByColumnAndRow(1, $row, $record['id']);
        $sheet->setCellValueByColumnAndRow(2, $row, $record['client_name'] ?? '');
        $sheet->setCellValueByColumnAndRow(3, $row, $record['project_name'] ?? '');
        $sheet->setCellValueByColumnAndRow(4, $row, $record['work_desc'] ?? '');
        $sheet->setCellValueByColumnAndRow(5, $row, $record['work_date']);
        $sheet->setCellValueByColumnAndRow(6, $row, $record['num_hours']);
        $row++;
    }

    $writer = new Xlsx($spreadsheet);
    $filename = 'timetracker-export-' . date('Y-m-d') . '.xlsx';

    ob_start();
    $writer->save('php://output');
    $content = ob_get_clean();

    $response->getBody()->write($content);
    return $response
        ->withHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        ->withHeader('Content-Disposition', "attachment; filename=\"{$filename}\"")
        ->withHeader('Cache-Control', 'max-age=0');
};

$exportPdf = function (Request $request, Response $response) use ($db): Response {
    $params = $request->getQueryParams();
    $rows = fetchTimeRecords($db, $params);

    require_once __DIR__ . '/lib/vendor/setasign/fpdf/fpdf.php';

    $pdf = new FPDF('L', 'mm', 'A4');
    $pdf->AddPage();
    $pdf->SetFont('Arial', 'B', 14);
    $pdf->Cell(0, 10, 'TimeTracker – Time Records Export', 0, 1, 'C');
    $pdf->SetFont('Arial', '', 9);
    $pdf->Cell(0, 6, 'Generated: ' . date('Y-m-d H:i'), 0, 1, 'C');
    $pdf->Ln(4);

    $pdf->SetFont('Arial', 'B', 9);
    $pdf->SetFillColor(230, 230, 230);
    $pdf->Cell(12, 7, 'ID', 1, 0, 'C', true);
    $pdf->Cell(55, 7, 'Client', 1, 0, 'L', true);
    $pdf->Cell(55, 7, 'Project', 1, 0, 'L', true);
    $pdf->Cell(100, 7, 'Description', 1, 0, 'L', true);
    $pdf->Cell(30, 7, 'Date', 1, 0, 'C', true);
    $pdf->Cell(15, 7, 'Hours', 1, 1, 'C', true);

    $pdf->SetFont('Arial', '', 8);
    $totalHours = 0.0;
    foreach ($rows as $record) {
        $pdf->Cell(12, 6, $record['id'], 1, 0, 'C');
        $pdf->Cell(55, 6, $record['client_name'] ?? '', 1, 0, 'L');
        $pdf->Cell(55, 6, $record['project_name'] ?? '', 1, 0, 'L');
        $pdf->Cell(100, 6, mb_substr($record['work_desc'] ?? '', 0, 60), 1, 0, 'L');
        $pdf->Cell(30, 6, substr($record['work_date'], 0, 10), 1, 0, 'C');
        $pdf->Cell(15, 6, number_format((float)$record['num_hours'], 1), 1, 1, 'R');
        $totalHours += (float)$record['num_hours'];
    }

    $pdf->SetFont('Arial', 'B', 9);
    $pdf->Cell(252, 7, 'Total Hours:', 1, 0, 'R');
    $pdf->Cell(15, 7, number_format($totalHours, 1), 1, 1, 'R');

    $filename = 'timetracker-export-' . date('Y-m-d') . '.pdf';
    $content = $pdf->Output('S');

    $response->getBody()->write($content);
    return $response
        ->withHeader('Content-Type', 'application/pdf')
        ->withHeader('Content-Disposition', "attachment; filename=\"{$filename}\"");
};

$listInvoices = function(Request $request, Response $response) use ($db): Response {
    $rows = $db->query(
        'SELECT i.*, c.name AS client_name
         FROM tt_invoice i
         LEFT JOIN tt_client c ON c.id = i.client_id
         ORDER BY i.created DESC'
    )->fetchAll();
    $response->getBody()->write(json_encode($rows));
    return $response->withHeader('Content-Type', 'application/json');
};

$createInvoice = function(Request $request, Response $response) use ($db): Response {
    $data = $request->getParsedBody() ?? [];

    foreach (['client_id', 'start_date', 'end_date'] as $field) {
        if (empty($data[$field])) {
            $response->getBody()->write(json_encode(['error' => "Field '{$field}' is required"]));
            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
        }
    }

    $countToday = (int)$db->query('SELECT COUNT(*) FROM tt_invoice WHERE DATE(created) = CURDATE()')->fetchColumn();
    $invoiceCount = $countToday + 1;
    $invoiceNumber = date('Ymd') . str_pad(strval($invoiceCount), 2, '0', STR_PAD_LEFT);

    $where = ['DATE(r.work_date) >= ?', 'DATE(r.work_date) <= ?', 'r.client_id = ?'];
    $values = [$data['start_date'], $data['end_date'], $data['client_id']];
    if (!empty($data['project_id'])) {
        $where[] = 'r.project_id = ?';
        $values[] = $data['project_id'];
    }

    $stmt = $db->prepare(
        'SELECT r.*, c.name AS client_name, p.name AS project_name,
                c.bill_rate AS client_bill_rate, p.bill_rate AS project_bill_rate
         FROM tt_time_record r
         LEFT JOIN tt_client c ON c.id = r.client_id
         LEFT JOIN tt_client_project p ON p.id = r.project_id
         WHERE ' . implode(' AND ', $where) . '
         ORDER BY r.work_date ASC'
    );
    $stmt->execute($values);
    $records = $stmt->fetchAll();

    $total = 0.0;
    foreach ($records as $record) {
        $rate = ($record['project_bill_rate'] > 0) ? $record['project_bill_rate'] : $record['client_bill_rate'];
        $total += (float)$record['num_hours'] * (float)$rate;
    }

    $db->prepare(
        'INSERT INTO tt_invoice (client_id, project_id, invoice_number, invoice_total, billed_date, is_billed, created, modified)
         VALUES (?, ?, ?, ?, NULL, 0, NOW(), NOW())'
    )->execute([
        $data['client_id'],
        $data['project_id'] ?? null,
        $invoiceNumber,
        round($total, 2),
    ]);
    $invoiceId = (int)$db->lastInsertId();

    $mapStmt = $db->prepare('INSERT INTO tt_invoice_record_map (invoice_id, time_record_id) VALUES (?, ?)');
    foreach ($records as $record) {
        $mapStmt->execute([$invoiceId, $record['id']]);
    }

    $invStmt = $db->prepare(
        'SELECT i.*, c.name AS client_name
         FROM tt_invoice i
         LEFT JOIN tt_client c ON c.id = i.client_id
         WHERE i.id = ?'
    );
    $invStmt->execute([$invoiceId]);
    $invoice = $invStmt->fetch();
    $invoice['time_records'] = $records;

    $response->getBody()->write(json_encode($invoice));
    return $response->withStatus(201)->withHeader('Content-Type', 'application/json');
};

$updateInvoice = function(Request $request, Response $response, array $args) use ($db): Response {
    $data = $request->getParsedBody() ?? [];
    $fields = ['modified = NOW()'];
    $values = [];

    if (array_key_exists('is_billed', $data)) {
        $fields[] = 'is_billed = ?';
        $values[] = (int)$data['is_billed'];
        if ((int)$data['is_billed'] === 1) {
            $cur = $db->prepare('SELECT billed_date FROM tt_invoice WHERE id = ?');
            $cur->execute([$args['id']]);
            $row = $cur->fetch();
            if ($row && $row['billed_date'] === null) {
                $fields[] = 'billed_date = CURDATE()';
            }
        }
    }
    if (array_key_exists('paid_date', $data)) {
        $fields[] = 'paid_date = ?';
        $values[] = $data['paid_date'] ?: null;
    }

    $values[] = $args['id'];
    $db->prepare('UPDATE tt_invoice SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($values);

    $stmt = $db->prepare(
        'SELECT i.*, c.name AS client_name
         FROM tt_invoice i
         LEFT JOIN tt_client c ON c.id = i.client_id
         WHERE i.id = ?'
    );
    $stmt->execute([$args['id']]);
    $response->getBody()->write(json_encode($stmt->fetch()));
    return $response->withHeader('Content-Type', 'application/json');
};

$generateInvoicePdf = function(Request $request, Response $response, array $args) use ($db): Response {
    require_once __DIR__ . '/lib/vendor/setasign/fpdf/fpdf.php';

    $stmt = $db->prepare(
        'SELECT i.*, c.name AS client_name, c.address_1, c.address_2,
                c.city, c.state_province, c.postal_code, c.bill_rate AS client_bill_rate,
                c.invoice_services, c.invoice_line_item
         FROM tt_invoice i
         LEFT JOIN tt_client c ON c.id = i.client_id
         WHERE i.id = ?'
    );
    $stmt->execute([$args['id']]);
    $invoice = $stmt->fetch();

    if (!$invoice) {
        $response->getBody()->write(json_encode(['error' => 'Invoice not found']));
        return $response->withStatus(404)->withHeader('Content-Type', 'application/json');
    }

    $recStmt = $db->prepare(
        'SELECT r.num_hours, r.work_desc, r.project_id, c.name AS client_name, p.name AS project_name,
                c.bill_rate AS client_bill_rate, p.bill_rate AS project_bill_rate,
                p.invoice_line_item AS project_line_item
         FROM tt_invoice_record_map m
         JOIN tt_time_record r ON r.id = m.time_record_id
         LEFT JOIN tt_client c ON c.id = r.client_id
         LEFT JOIN tt_client_project p ON p.id = r.project_id
         WHERE m.invoice_id = ?
         ORDER BY r.work_date ASC'
    );
    $recStmt->execute([$args['id']]);
    $records = $recStmt->fetchAll();

    // Business identity
    $bizLine1   = 'Colin Andrew Ferm';
    $bizLine2   = '68 Jay St. #508';
    $bizLine3   = 'Brooklyn, NY 11201';
    $bizLine4   = 'Colin Ferm';
    $bizLine5   = 'c: 917.805.5914';
    $bizTagline = 'We are ready to believe you!';

    $pdf = new FPDF('P', 'mm', 'A4');
    $pdf->AddPage();
    $pdf->SetMargins(15, 15, 15);
    $pdf->SetAutoPageBreak(false);

    // ── Orange logo box ──────────────────────────────────────────────────────
    $pdf->SetFillColor(220, 95, 15);
    $pdf->Rect(15, 15, 72, 22, 'F');

    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetFont('Arial', 'B', 20);
    $pdf->SetXY(15, 18);
    $pdf->Cell(32, 16, '42', 0, 0, 'C');

    $pdf->SetDrawColor(255, 255, 255);
    $pdf->SetLineWidth(0.7);
    $pdf->Line(47, 18, 47, 35);
    $pdf->SetLineWidth(0.2);
    $pdf->SetDrawColor(0, 0, 0);

    $pdf->SetFont('Arial', 'B', 11);
    $pdf->SetXY(47, 20);
    $pdf->Cell(40, 12, 'SOLUTIONS', 0, 0, 'C');

    // ── INVOICE heading ──────────────────────────────────────────────────────
    $pdf->SetFont('Arial', '', 38);
    $pdf->SetTextColor(185, 185, 185);
    $pdf->SetXY(90, 12);
    $pdf->Cell(105, 28, 'INVOICE', 0, 0, 'R');

    // ── Separator ────────────────────────────────────────────────────────────
    $pdf->SetDrawColor(0, 0, 0);
    $pdf->Line(15, 42, 195, 42);

    // ── Left info column ─────────────────────────────────────────────────────
    $pdf->SetTextColor(0, 0, 0);
    $leftY = 47;
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->SetXY(15, $leftY); $pdf->Cell(85, 5, $bizLine1, 0, 0, 'L'); $leftY += 5;
    $pdf->SetFont('Arial', '', 10);
    $pdf->SetXY(15, $leftY); $pdf->Cell(85, 5, $bizLine2, 0, 0, 'L'); $leftY += 5;
    $pdf->SetXY(15, $leftY); $pdf->Cell(85, 5, $bizLine3, 0, 0, 'L'); $leftY += 8;
    $pdf->SetXY(15, $leftY); $pdf->Cell(85, 5, $bizLine4, 0, 0, 'L'); $leftY += 5;
    $pdf->SetXY(15, $leftY); $pdf->Cell(85, 5, $bizLine5, 0, 0, 'L'); $leftY += 8;
    $pdf->SetXY(15, $leftY); $pdf->Cell(85, 5, 'Invoice #: ' . $invoice['invoice_number'], 0, 0, 'L');

    // ── Right info column ────────────────────────────────────────────────────
    $rightY = 47;

    // Bill To
    $pdf->SetXY(105, $rightY);
    $pdf->SetTextColor(140, 140, 140);
    $pdf->SetFont('Arial', '', 9);
    $pdf->Cell(22, 5, 'Bill To:', 0, 0, 'L');
    $pdf->SetTextColor(0, 0, 0);
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->Cell(68, 5, $invoice['client_name'], 0, 0, 'L');
    $rightY += 5;

    $pdf->SetFont('Arial', '', 10);
    if (!empty($invoice['address_1'])) {
        $pdf->SetXY(127, $rightY);
        $pdf->Cell(68, 5, $invoice['address_1'], 0, 0, 'L');
        $rightY += 5;
    }
    if (!empty($invoice['address_2'])) {
        $pdf->SetXY(127, $rightY);
        $pdf->Cell(68, 5, $invoice['address_2'], 0, 0, 'L');
        $rightY += 5;
    }
    $cityLine = trim(
        ($invoice['city'] ?? '') .
        (($invoice['state_province'] ?? '') ? ', ' . $invoice['state_province'] : '') .
        (($invoice['postal_code'] ?? '') ? ' ' . $invoice['postal_code'] : '')
    );
    if ($cityLine) {
        $pdf->SetXY(127, $rightY);
        $pdf->Cell(68, 5, $cityLine, 0, 0, 'L');
        $rightY += 5;
    }

    // Date
    $rightY += 3;
    $pdf->SetXY(105, $rightY);
    $pdf->SetTextColor(140, 140, 140);
    $pdf->SetFont('Arial', '', 9);
    $pdf->Cell(22, 5, 'Date:', 0, 0, 'L');
    $pdf->SetTextColor(0, 0, 0);
    $pdf->SetFont('Arial', '', 10);
    $dateStr = $invoice['created'] ? date('n/j/Y', strtotime($invoice['created'])) : date('n/j/Y');
    $pdf->Cell(68, 5, $dateStr, 0, 0, 'L');
    $rightY += 7;

    // For
    $pdf->SetXY(105, $rightY);
    $pdf->SetTextColor(140, 140, 140);
    $pdf->SetFont('Arial', '', 9);
    $pdf->Cell(22, 5, 'For:', 0, 0, 'L');
    $pdf->SetTextColor(0, 0, 0);
    $pdf->SetFont('Arial', '', 10);
    $pdf->Cell(68, 5, $invoice['invoice_services'] ?: 'Consulting Services', 0, 0, 'L');

    // ── Line items table ─────────────────────────────────────────────────────
    $tableY    = 97;
    $tableEndY = 237;
    $headerH   = 8;
    $rowH      = 7;

    $pdf->SetDrawColor(0, 0, 0);
    $pdf->Rect(15, $tableY, 180, $tableEndY - $tableY);

    $pdf->SetFillColor(50, 50, 50);
    $pdf->Rect(15, $tableY, 180, $headerH, 'F');

    $pdf->SetLineWidth(0.3);
    $pdf->Line(145, $tableY, 145, $tableEndY);
    $pdf->Line(165, $tableY, 165, $tableEndY);
    $pdf->SetLineWidth(0.2);

    $pdf->SetFont('Arial', 'B', 10);
    $pdf->SetTextColor(255, 255, 255);
    $pdf->SetXY(17, $tableY + 2);
    $pdf->Cell(126, 5, 'Description', 0, 0, 'L');
    $pdf->SetXY(145, $tableY + 2);
    $pdf->Cell(20, 5, 'Hours', 0, 0, 'C');
    $pdf->SetXY(165, $tableY + 2);
    $pdf->Cell(28, 5, 'Amount', 0, 0, 'R');

    $pdf->SetFont('Arial', '', 10);
    $pdf->SetTextColor(0, 0, 0);

    $groups = [];
    foreach ($records as $rec) {
        if (!empty($rec['project_id'])) {
            $key = 'p_' . $rec['project_id'];
            if (!isset($groups[$key])) {
                $rate = ((float)($rec['project_bill_rate'] ?? 0) > 0)
                    ? (float)$rec['project_bill_rate']
                    : (float)$rec['client_bill_rate'];
                $groups[$key] = [
                    'label' => $rec['project_line_item'] ?: 'Services',
                    'hours' => 0.0,
                    'rate'  => $rate,
                ];
            }
            $groups[$key]['hours'] += (float)$rec['num_hours'];
        } else {
            if (!isset($groups['client'])) {
                $groups['client'] = [
                    'label' => $invoice['invoice_line_item'] ?: 'Services Rendered',
                    'hours' => 0.0,
                    'rate'  => (float)($invoice['client_bill_rate'] ?? 0),
                ];
            }
            $groups['client']['hours'] += (float)$rec['num_hours'];
        }
    }

    $totalHours = 0.0;
    $rowY = $tableY + $headerH;

    foreach ($groups as $group) {
        $amount = $group['hours'] * $group['rate'];
        $totalHours += $group['hours'];

        $pdf->SetXY(17, $rowY + 2);
        $pdf->Cell(126, 5, $group['label'], 0, 0, 'L');
        $pdf->SetXY(145, $rowY + 2);
        $pdf->Cell(20, 5, number_format($group['hours'], 2), 0, 0, 'C');
        $pdf->SetXY(165, $rowY + 2);
        $pdf->Cell(28, 5, '$' . number_format($amount, 2), 0, 0, 'R');

        $rowY += $rowH;
        if ($rowY < $tableEndY) {
            $pdf->SetDrawColor(210, 210, 210);
            $pdf->Line(15, $rowY, 195, $rowY);
            $pdf->SetDrawColor(0, 0, 0);
        }
    }

    // ── Summary (bottom right) ───────────────────────────────────────────────
    $summaryY = $tableEndY + 3;
    $labelX   = 120;
    $labelW   = 45;
    $valueW   = 30;
    $rowH     = 7;
    $rate     = (float)($invoice['client_bill_rate'] ?? 0);

    $pdf->SetFont('Arial', '', 10);
    $pdf->SetTextColor(0, 0, 0);

    $pdf->SetXY($labelX, $summaryY);
    $pdf->Cell($labelW, $rowH, 'Rate:', 0, 0, 'R');
    $pdf->Cell($valueW, $rowH, '$' . number_format($rate, 2), 0, 1, 'R');

    $pdf->SetX($labelX);
    $pdf->Cell($labelW, $rowH, 'Total Hours:', 0, 0, 'R');
    $pdf->Cell($valueW, $rowH, number_format($totalHours, 2), 0, 1, 'R');

    $pdf->SetX($labelX);
    $pdf->Cell($labelW, $rowH, 'Other:', 0, 0, 'R');
    $pdf->Cell($valueW, $rowH, '$0.00', 0, 1, 'R');

    $pdf->SetFillColor(200, 200, 200);
    $pdf->SetFont('Arial', 'B', 10);
    $pdf->SetX($labelX);
    $pdf->Cell($labelW, $rowH, 'Total:', 1, 0, 'R', true);
    $pdf->Cell($valueW, $rowH, '$' . number_format((float)$invoice['invoice_total'], 2), 1, 1, 'R', true);

    // ── Tagline ──────────────────────────────────────────────────────────────
    $pdf->SetFont('Arial', 'I', 9);
    $pdf->SetTextColor(80, 80, 80);
    $pdf->SetXY(15, $summaryY + ($rowH * 3));
    $pdf->Cell(100, $rowH, $bizTagline, 0, 0, 'L');

    $filename = 'invoice-' . $invoice['invoice_number'] . '.pdf';
    $content  = $pdf->Output('S');

    $response->getBody()->write($content);
    return $response
        ->withHeader('Content-Type', 'application/pdf')
        ->withHeader('Content-Disposition', 'inline; filename="' . $filename . '"');
};
