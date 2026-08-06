<?php
/**
 * send-lead.php — receives contact/booking form leads, stores them to a
 * local CSV (leads.csv, protected by .htaccess) and emails the hospital.
 * Accepts POST as JSON or standard form-encoded data.
 */

header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['ok' => false, 'error' => 'Method not allowed']); exit; }

// ---- CONFIG -----------------------------------------------------------
$HOSPITAL_EMAIL = 'care@jphospitals.in';   // <-- change if you want leads sent elsewhere
$FROM_EMAIL     = 'no-reply@' . ($_SERVER['HTTP_HOST'] ?? 'drravigarg.com');
$SITE_NAME      = 'Dr. Ravi Garg, JP Hospital Zirakpur';
// -------------------------------------------------------------------------

function field($arr, $key, $max = 2000) {
  $v = isset($arr[$key]) ? trim((string) $arr[$key]) : '';
  return mb_substr($v, 0, $max);
}

$raw = file_get_contents('php://input');
$json = json_decode($raw, true);
$data = is_array($json) ? $json : $_POST;

$type    = field($data, 'type', 40) ?: 'contact';       // contact | booking
$name    = field($data, 'name', 120);
$email   = field($data, 'email', 160);
$phone   = field($data, 'phone', 40);
$topic   = field($data, 'topic', 120);
$message = field($data, 'notes') ?: field($data, 'message');
$date    = field($data, 'date', 20);
$time    = field($data, 'label') ?: field($data, 'time', 20);
$source  = field($data, 'source', 120);

if ($name === '' || ($email === '' && $phone === '')) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'Name and at least one of email or phone are required.']);
  exit;
}
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'Invalid email address.']);
  exit;
}

$now = date('Y-m-d H:i:s');
$ip  = $_SERVER['REMOTE_ADDR'] ?? '';

// ---- 1. Store lead in leads.csv ---------------------------------------
$csvPath = __DIR__ . '/leads.csv';
$isNew = !file_exists($csvPath);
$fh = fopen($csvPath, 'a');
if ($fh) {
  if ($isNew) {
    fputcsv($fh, ['timestamp', 'type', 'name', 'email', 'phone', 'topic', 'date', 'time', 'message', 'source', 'ip']);
  }
  fputcsv($fh, [$now, $type, $name, $email, $phone, $topic, $date, $time, $message, $source, $ip]);
  fclose($fh);
}

// ---- 2. Email the hospital ---------------------------------------------
$subject = ($type === 'booking' ? 'New appointment request' : 'New contact enquiry') . ' — ' . $name;

$lines = [];
$lines[] = 'A new ' . ($type === 'booking' ? 'appointment booking' : 'contact enquiry') . ' was submitted on ' . $SITE_NAME . '.';
$lines[] = '';
$lines[] = 'Name: ' . $name;
if ($email) $lines[] = 'Email: ' . $email;
if ($phone) $lines[] = 'Phone: ' . $phone;
if ($topic) $lines[] = 'Concern: ' . $topic;
if ($date)  $lines[] = 'Preferred date: ' . $date;
if ($time)  $lines[] = 'Preferred time: ' . $time;
if ($message) { $lines[] = ''; $lines[] = 'Message:'; $lines[] = $message; }
$lines[] = '';
$lines[] = 'Submitted: ' . $now . ' (IP ' . $ip . ')';

$body = implode("\n", $lines);
$headers = [];
$headers[] = 'From: ' . $SITE_NAME . ' <' . $FROM_EMAIL . '>';
if ($email) $headers[] = 'Reply-To: ' . $email;
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-Type: text/plain; charset=UTF-8';

$mailSent = @mail($HOSPITAL_EMAIL, $subject, $body, implode("\r\n", $headers));

echo json_encode(['ok' => true, 'mailed' => $mailSent]);
