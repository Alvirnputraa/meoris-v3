require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runFix() {
  try {
    console.log('🔧 Checking returns storage bucket...\n');

    // Check if bucket exists
    console.log('📦 Listing buckets...');
    const { data: buckets, error: bucketError } = await supabase
      .storage
      .listBuckets();

    if (bucketError) {
      console.error('❌ Error listing buckets:', bucketError);
      return;
    }

    console.log('Found buckets:', buckets.map(b => b.id).join(', '));

    const returnsBucket = buckets.find(b => b.id === 'returns');

    if (!returnsBucket) {
      console.log('\n⚠️ Returns bucket not found. Creating...');
      const { data: newBucket, error: createError } = await supabase
        .storage
        .createBucket('returns', {
          public: true,
          fileSizeLimit: 10485760 // 10MB
        });

      if (createError) {
        console.error('❌ Error creating bucket:', createError);
      } else {
        console.log('✅ Bucket created successfully!');
      }
    } else {
      console.log('\n✅ Returns bucket exists');
      console.log('   - Public:', returnsBucket.public);
      console.log('   - File size limit:', returnsBucket.file_size_limit || 'unlimited');

      // Update to ensure it's public
      if (!returnsBucket.public) {
        console.log('\n🔧 Making bucket public...');
        const { data, error } = await supabase
          .storage
          .updateBucket('returns', { public: true });

        if (error) {
          console.error('❌ Error:', error);
        } else {
          console.log('✅ Bucket is now public');
        }
      }
    }

    // Test upload
    console.log('\n🧪 Testing file upload...');
    const testFile = new Blob(['test content'], { type: 'text/plain' });
    const testFileName = `test_${Date.now()}.txt`;

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('returns')
      .upload(testFileName, testFile);

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError);
    } else {
      console.log('✅ Upload test successful:', uploadData.path);

      // Get public URL
      const { data: urlData } = supabase
        .storage
        .from('returns')
        .getPublicUrl(uploadData.path);

      console.log('   Public URL:', urlData.publicUrl);

      // Clean up test file
      await supabase.storage.from('returns').remove([uploadData.path]);
      console.log('   Test file cleaned up');
    }

    console.log('\n✅ Done!');
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

runFix();
