<?php
// mail-test.php — visit https://drravigarg.com/mail-test.php
// Calls send-lead.php exactly as the site's forms do and prints the result.
// Delete this file once email is working.
header('Content-Type: text/plain; charset=UTF-8');

$payload = json_encode([
  'type' => 'contact', 'name' => 'Mail Test', 'email' => 'test@example.com',
  'phone' => '9999999999', 'message' => 'Delivery diagnostic ' . date('H:i:s'),
  'source' => 'mail-test.php',
]);

$url = 'https://' . ($_SERVER['HTTP_HOST'] ?? 'drravigarg.com') . '/send-lead.php';
$ch = curl_init($url);
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_POSTFIELDS => $payload,
  CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 60,
  CURLOPT_SSL_VERIFYPEER => false,
]);
$res = curl_exec($ch);
$err = curl_error($ch);
curl_close($ch);

echo "POST $url\n\n";
echo $err ? "curl error: $err\n" : "response: $res\n";

echo "\n--- Local mail server reachability ---\n";
foreach ([['localhost', 25], ['localhost', 587], ['localhost', 465]] as [$h, $p]) {
  $t0 = microtime(true);
  $fp = @stream_socket_client("tcp://$h:$p", $e, $es, 6);
  echo "$h:$p " . ($fp ? 'OPEN' : "closed ($es)") . sprintf("  %.1fs\n", microtime(true) - $t0);
  if ($fp) { echo '   banner: ' . trim((string) fgets($fp, 300)) . "\n"; fclose($fp); }
}

echo "\n--- PHP mail() available: " . (function_exists('mail') ? 'yes' : 'no') . " ---\n";
