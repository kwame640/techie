<?php
declare(strict_types=1);

function sendJson(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode(
        $payload,
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
    );
    exit;
}

$allowedOrigins = array_values(array_filter(array_map(
    'trim',
    explode(',', (string) getenv('VENDOR_LOGIN_ALLOWED_ORIGINS'))
)));
if ($allowedOrigins === []) {
    $allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Max-Age: 600');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    sendJson(204, []);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    sendJson(405, ['success' => false, 'error' => 'Method not allowed.']);
}

$rawInput = file_get_contents('php://input');
if ($rawInput === false) {
    sendJson(400, ['success' => false, 'error' => 'Request body could not be read.']);
}
if (strlen($rawInput) > 16384) {
    sendJson(413, ['success' => false, 'error' => 'Request body is too large.']);
}

$contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
$input = null;
if (str_starts_with($contentType, 'application/json')) {
    try {
        $input = json_decode($rawInput, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        sendJson(400, ['success' => false, 'error' => 'Request body must be valid JSON.']);
    }
} elseif (str_starts_with($contentType, 'application/x-www-form-urlencoded')) {
    parse_str($rawInput, $input);
} else {
    sendJson(415, ['success' => false, 'error' => 'Content-Type must be application/json or application/x-www-form-urlencoded.']);
}

if (!is_array($input)) {
    sendJson(400, ['success' => false, 'error' => 'Request body must be an object.']);
}

$businessName = isset($input['businessName']) && is_scalar($input['businessName'])
    ? trim((string) $input['businessName'])
    : '';
$email = isset($input['email']) && is_scalar($input['email'])
    ? trim((string) $input['email'])
    : '';

if ($businessName === '' || strlen($businessName) > 150 || $email === '' || strlen($email) > 254) {
    sendJson(400, ['success' => false, 'error' => 'Business name and email are required.']);
}
if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    sendJson(400, ['success' => false, 'error' => 'A valid email is required.']);
}

$allowedBusinesses = [
    'knorr collection',
    'glorriet beauty bloom',
    'trendora fashion hub',
    'qweku khapii',
];

$normalizedBusinessName = strtolower($businessName);
if (!in_array($normalizedBusinessName, $allowedBusinesses, true)) {
    sendJson(403, ['success' => false, 'error' => 'This business is not an approved NKAY vendor.']);
}

$vendorId = 'vendor-' . str_replace(' ', '-', $normalizedBusinessName);

sendJson(200, [
    'success' => true,
    'registration' => [
        'id' => $vendorId,
        'email' => $email,
        'businessName' => $businessName,
        'businessCategory' => '',
        'businessType' => '',
        'phone' => '',
        'address' => '',
        'city' => '',
        'region' => '',
        'description' => '',
        'status' => 'Approved',
        'registrationDate' => date('c'),
    ],
]);

