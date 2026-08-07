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
$HOSPITAL_EMAIL = 'care@jphospitals.in, varun.blogs@gmail.com, info@vardish.com, isonicmedia.ai@gmail.com';   // <-- change if you want leads sent elsewhere
$SITE_NAME      = 'Dr. Ravi Garg, JP Hospital Zirakpur';
// SMTP via Gmail — sender account + app password (Google Account -> Security ->
// 2-Step Verification -> App passwords). NOT the normal Gmail password.
$SMTP_HOST = 'smtp.gmail.com';
$SMTP_PORT = 587;
$SMTP_USER = 'carejphospital@gmail.com';
$SMTP_PASS = 'epkshluazipmfgwg';
$FROM_EMAIL = $SMTP_USER; // Gmail forces the From to the authenticated account
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

// ---- Minimal SMTP client (STARTTLS + AUTH LOGIN) ------------------------
function smtp_send($host, $port, $user, $pass, $fromName, $recipients, $subject, $body, $replyTo) {
  $fp = @stream_socket_client("tcp://$host:$port", $errno, $errstr, 15);
  if (!$fp) return 'connect: ' . $errstr;
  stream_set_timeout($fp, 15);
  $read = function () use ($fp) {
    $out = '';
    while ($line = fgets($fp, 515)) { $out .= $line; if (strlen($line) < 4 || $line[3] !== '-') break; }
    return $out;
  };
  $cmd = function ($c, $expect) use ($fp, $read) {
    if ($c !== null) fwrite($fp, $c . "\r\n");
    $r = $read();
    if (strpos($r, (string) $expect) !== 0) throw new Exception(trim($c . ' -> ' . $r));
    return $r;
  };
  try {
    $cmd(null, 220);
    $cmd('EHLO drravigarg.com', 250);
    $cmd('STARTTLS', 220);
    if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) throw new Exception('TLS failed');
    $cmd('EHLO drravigarg.com', 250);
    $cmd('AUTH LOGIN', 334);
    $cmd(base64_encode($user), 334);
    $cmd(base64_encode($pass), 235);
    $cmd("MAIL FROM:<$user>", 250);
    foreach ($recipients as $r) $cmd('RCPT TO:<' . trim($r) . '>', 250);
    $cmd('DATA', 354);
    $h  = 'From: ' . $fromName . " <$user>\r\n";
    $h .= 'To: ' . implode(', ', $recipients) . "\r\n";
    if ($replyTo) $h .= "Reply-To: $replyTo\r\n";
    $h .= 'Subject: =?UTF-8?B?' . base64_encode($subject) . "?=\r\n";
    $h .= "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n";
    $h .= 'Date: ' . date('r') . "\r\n";
    $msg = $h . "\r\n" . preg_replace('/^\./m', '..', str_replace("\n", "\r\n", $body));
    fwrite($fp, $msg . "\r\n.\r\n");
    $cmd(null, 250);
    $cmd('QUIT', 221);
    fclose($fp);
    return true;
  } catch (Exception $e) { fclose($fp); return $e->getMessage(); }
}

$recipients = array_map('trim', explode(',', $HOSPITAL_EMAIL));
$result = smtp_send($SMTP_HOST, $SMTP_PORT, $SMTP_USER, $SMTP_PASS, $SITE_NAME, $recipients, $subject, $body, $email ?: null);
$mailSent = ($result === true);
if (!$mailSent) {
  // fallback to PHP mail() so leads aren't lost while SMTP is being set up
  $headers = 'From: ' . $SITE_NAME . ' <' . $FROM_EMAIL . ">\r\n" . ($email ? "Reply-To: $email\r\n" : '') . "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8";
  $mailSent = @mail($HOSPITAL_EMAIL, $subject, $body, $headers);
}

echo json_encode(['ok' => true, 'mailed' => $mailSent, 'smtp' => ($result === true ? 'ok' : $result)]);
