const { exec } = require('child_process');
const fs = require('fs');

console.log('⏰ Cron Scheduler for 16:00');
console.log('═══════════════════════════════════════\n');

// Get current time
const now = new Date();
const currentTime = now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
console.log(`📅 Current time: ${currentTime}`);

// Calculate time until 16:00
const target = new Date(now);
target.setHours(16, 0, 0, 0); // Set to 16:00:00

// If it's already past 16:00, set for tomorrow
if (now >= target) {
  console.log('⚠️  Already past 16:00 today!');
  console.log('Please run setup_test_for_16.js again tomorrow.');
  process.exit(1);
}

const msUntilTarget = target.getTime() - now.getTime();
const secondsUntil = Math.floor(msUntilTarget / 1000);
const minutesUntil = Math.floor(secondsUntil / 60);
const secondsRemaining = secondsUntil % 60;

console.log(`🎯 Target time: 16:00:00 WIB`);
console.log(`⏱️  Time until cron: ${minutesUntil} menit ${secondsRemaining} detik\n`);

console.log('⏳ Waiting for 16:00...');
console.log('   (Script will auto-trigger cron job at exactly 16:00:00)');
console.log('   DO NOT close this window!\n');

// Show countdown every 30 seconds
let lastMinute = minutesUntil;
const countdownInterval = setInterval(() => {
  const nowCheck = new Date();
  const msLeft = target.getTime() - nowCheck.getTime();
  const minsLeft = Math.floor(msLeft / 1000 / 60);
  const secsLeft = Math.floor((msLeft / 1000) % 60);

  if (minsLeft !== lastMinute) {
    console.log(`⏳ ${minsLeft} menit ${secsLeft} detik lagi...`);
    lastMinute = minsLeft;
  }
}, 30000); // Every 30 seconds

// Schedule the cron trigger
setTimeout(async () => {
  clearInterval(countdownInterval);

  console.log('\n🔔 16:00 REACHED! Triggering cron job...\n');
  console.log('═══════════════════════════════════════');

  // Trigger the cron job
  exec('curl http://localhost:3000/api/cron/cancel-expired-returns', (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`❌ stderr: ${stderr}`);
      return;
    }

    console.log('📡 Cron Job Response:');
    console.log(stdout);

    try {
      const response = JSON.parse(stdout);
      console.log('\n✅ Results:');
      console.log(`   Expired returns found: ${response.expired}`);
      console.log(`   Returns cancelled: ${response.cancelled}`);
      console.log(`   Orders completed: ${response.ordersCompleted}`);

      // Load return info
      try {
        const returnInfo = JSON.parse(fs.readFileSync('.test_return_id', 'utf8'));
        console.log('\n📦 Check your return:');
        console.log(`   Order: ${returnInfo.orderNumber}`);
        console.log(`   Status should now be: expired`);
        console.log(`\n🔗 View in browser:`);
        console.log(`   http://localhost:3000/user/purchase?view=order-detail&order=${returnInfo.orderId}&action=returnrequest&timeline=return`);
      } catch (e) {
        // Ignore if file not found
      }

      console.log('\n🎉 Auto-cancel test completed!');

    } catch (e) {
      console.error('Could not parse response:', e.message);
    }

    console.log('\n═══════════════════════════════════════');
  });

}, msUntilTarget);

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n❌ Scheduler cancelled by user.');
  process.exit(0);
});
