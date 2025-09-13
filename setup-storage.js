// Script pour configurer les buckets Supabase Storage
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kwedbyldfnmalhotffjt.supabase.co';
const supabaseServiceKey = 'YOUR_SERVICE_ROLE_KEY'; // Remplacer par la clé service role

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
  try {
    console.log('🔧 Configuration des buckets Supabase Storage...');

    // Lister les buckets existants
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Erreur lors de la liste des buckets:', listError);
      return;
    }

    console.log('📦 Buckets existants:', existingBuckets?.map(b => b.name));

    const bucketsToCreate = [
      {
        name: 'property-images',
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        fileSizeLimit: 10485760 // 10MB
      },
      {
        name: 'property-documents',
        public: true,
        allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        fileSizeLimit: 20971520 // 20MB
      }
    ];

    for (const bucketConfig of bucketsToCreate) {
      const bucketExists = existingBuckets?.some(b => b.name === bucketConfig.name);
      
      if (!bucketExists) {
        console.log(`📁 Création du bucket: ${bucketConfig.name}`);
        
        const { data, error } = await supabase.storage.createBucket(bucketConfig.name, {
          public: bucketConfig.public,
          allowedMimeTypes: bucketConfig.allowedMimeTypes,
          fileSizeLimit: bucketConfig.fileSizeLimit
        });

        if (error) {
          console.error(`❌ Erreur création bucket ${bucketConfig.name}:`, error);
        } else {
          console.log(`✅ Bucket ${bucketConfig.name} créé avec succès`);
        }
      } else {
        console.log(`✅ Bucket ${bucketConfig.name} existe déjà`);
      }
    }

    // Vérifier les politiques RLS
    console.log('\n🔒 Vérification des politiques de sécurité...');
    console.log('Les politiques suivantes doivent être créées dans Supabase Dashboard:');
    
    console.log('\n📋 Politiques pour property-images:');
    console.log('1. Nom: "Allow public read access"');
    console.log('   Type: SELECT');
    console.log('   Target: public');
    console.log('   Policy: true');
    
    console.log('\n2. Nom: "Allow authenticated users to upload"');
    console.log('   Type: INSERT');
    console.log('   Target: authenticated');
    console.log('   Policy: auth.role() = \'authenticated\'');
    
    console.log('\n📋 Politiques pour property-documents:');
    console.log('1. Nom: "Allow public read access"');
    console.log('   Type: SELECT');
    console.log('   Target: public');
    console.log('   Policy: true');
    
    console.log('\n2. Nom: "Allow authenticated users to upload"');
    console.log('   Type: INSERT');
    console.log('   Target: authenticated');
    console.log('   Policy: auth.role() = \'authenticated\'');

    console.log('\n🎉 Configuration terminée !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error);
  }
}

setupStorage();
