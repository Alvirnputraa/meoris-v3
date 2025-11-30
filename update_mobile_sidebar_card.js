const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/app/produk/[id]/detail/page.tsx',
  'src/app/user/purchase/page.tsx',
  'src/app/produk/checkout/page.tsx',
  'src/app/produk/detail-checkout/page.tsx',
  'src/app/produk/pesanan/page.tsx',
  'src/app/produk/pesanan/[orderId]/page.tsx',
  'src/app/produk/pesanan/[orderId]/lacak/page.tsx',
  'src/app/produk/[id]/checkout/page.tsx',
  'src/app/produk/[id]/detail-checkout/page.tsx',
];

const oldPattern = `<div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {mounted && user ? ((user as any)?.nama?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()) : 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {mounted && user ? ((user as any)?.nama || user.email) : 'User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>`;

const newPattern = `<div className="flex items-center gap-3 bg-gray-100 rounded-xl p-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {mounted && user ? ((user as any)?.nama?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()) : 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {mounted && user ? ((user as any)?.nama || user.email) : 'User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>`;

let updatedCount = 0;
let skippedCount = 0;

console.log('🚀 Starting mobile sidebar card update...\n');

filesToUpdate.forEach(file => {
  const filePath = path.join(__dirname, file);

  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  Skipped: ${file} (file not found)`);
    skippedCount++;
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes('bg-gray-100 rounded-xl p-3')) {
      console.log(`✅ Already updated: ${file}`);
      skippedCount++;
      return;
    }

    if (content.includes(oldPattern)) {
      content = content.replace(oldPattern, newPattern);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${file}`);
      updatedCount++;
    } else {
      console.log(`⏭️  Skipped: ${file} (pattern not found)`);
      skippedCount++;
    }
  } catch (error) {
    console.error(`❌ Error updating ${file}:`, error.message);
    skippedCount++;
  }
});

console.log('\n📊 Summary:');
console.log(`   ✅ Updated: ${updatedCount} files`);
console.log(`   ⏭️  Skipped: ${skippedCount} files`);
console.log('\n🎉 Done!');
