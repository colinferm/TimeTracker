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
