<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TimeTracker</title>

    <!-- Bootstrap CSS -->
    <link rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
          integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN"
          crossorigin="anonymous">

    <style>
        body { background-color: #f8f9fa; }
        .calendar-table tr { height: 100px; }
        .calendar-table thead tr { height: 40px; }
        .calendar-table td { cursor: pointer; width: 14%; }
        .calendar-table td:hover { background-color: #e9ecef; }
        .calendar-table .today-cell { border: 2px solid #0d6efd !important; }
        .calendar-table td .badge.rounded-circle { padding: 5px; }
        .record-list { min-height: 200px; }
    </style>
</head>
<body>

<div id="app"></div>

<!-- ─── Handlebars templates ───────────────────────────────────── -->
<?php
// Inline all templates from src/tmpl/ so the TPL loader can find them.
$tmplDir = __DIR__ . '/tmpl';
foreach (glob($tmplDir . '/*.html') as $file) {
    $name = basename($file, '.html');
    echo '<script type="text/template" id="' . htmlspecialchars($name) . '">' . "\n";
    echo file_get_contents($file) . "\n";
    echo "</script>\n\n";
}
?>

<!-- ─── Vendor libraries ──────────────────────────────────────── -->
<script src="https://code.jquery.com/jquery-3.7.1.min.js"
        integrity="sha256-/JqT3SQfawRcv/BIHPThkBvs0OEvtFFmqPF/lYI/Cxo="
        crossorigin="anonymous"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.13.6/underscore-min.js"
        crossorigin="anonymous"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/backbone.js/1.5.0/backbone-min.js"
        crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/handlebars@4.7.8/dist/handlebars.min.js"
        crossorigin="anonymous"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.4/moment.min.js"
        crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"
        integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL"
        crossorigin="anonymous"></script>

<!-- ─── Application JS ────────────────────────────────────────── -->
<script src="/js/timetracker.js"></script>

<script>
    $(function () {
        app.init();
    });
</script>

</body>
</html>
