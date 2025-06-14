// Test per verificare le nuove funzionalità del Project Manager
// Questo file può essere eseguito manualmente per verificare le funzionalità

/**
 * Test suite per Project Manager con nuove funzionalità
 */

const PROJECT_MANAGER_TESTS = {
  // Mock del server URL per i test
  serverUrl: 'http://localhost:8000',
  userId: 'test-user',

  /**
   * Test 1: Verifica creazione progetto senza file iniziali
   */
  async testProjectCreation() {
    console.log('🧪 Testing project creation without initial files...');

    const formData = new FormData();
    formData.append('project_name', 'Test Project');
    formData.append('file_path', 'README.md');
    formData.append(
      'content',
      '# Test Project\n\nTest description\n\nThis project was created using the Project Manager.',
    );
    formData.append('description', 'Test description');

    try {
      const response = await fetch(
        `${this.serverUrl}/project/${this.userId}/create-file`,
        {
          method: 'POST',
          body: formData,
        },
      );

      const data = await response.json();

      if (data.success) {
        console.log('✅ Project creation test passed');
        console.log('📁 Project created:', data.project_name);
        return true;
      } else {
        console.log('❌ Project creation test failed:', data.error);
        return false;
      }
    } catch (error) {
      console.log('❌ Project creation test error:', error);
      return false;
    }
  },

  /**
   * Test 2: Verifica eliminazione file
   */
  async testFileDelection(projectName, filePath) {
    console.log('🧪 Testing file deletion...');

    const formData = new FormData();
    formData.append('project_name', projectName);
    formData.append('file_path', filePath);

    try {
      const response = await fetch(
        `${this.serverUrl}/project/${this.userId}/delete-file`,
        {
          method: 'DELETE',
          body: formData,
        },
      );

      const data = await response.json();

      if (data.success) {
        console.log('✅ File deletion test passed');
        console.log('🗑️ File deleted:', data.deleted_file.file_path);
        console.log('📊 Remaining files:', data.remaining_files);
        return true;
      } else {
        console.log('❌ File deletion test failed:', data.error);
        return false;
      }
    } catch (error) {
      console.log('❌ File deletion test error:', error);
      return false;
    }
  },

  /**
   * Test 3: Verifica caricamento progetti esistenti
   */
  async testProjectListing() {
    console.log('🧪 Testing project listing...');

    try {
      const response = await fetch(
        `${this.serverUrl}/list/projects/${this.userId}`,
      );
      const data = await response.json();

      if (data.success) {
        console.log('✅ Project listing test passed');
        console.log('📂 Total projects:', data.total);
        console.log(
          '📋 Projects:',
          data.projects.map((p) => p.project_name),
        );
        return true;
      } else {
        console.log('❌ Project listing test failed:', data.error);
        return false;
      }
    } catch (error) {
      console.log('❌ Project listing test error:', error);
      return false;
    }
  },

  /**
   * Test 4: Verifica upload multipli di file in progetto esistente
   */
  async testMultipleFileUpload(projectName, files) {
    console.log('🧪 Testing multiple file upload...');

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('project_name', projectName);

        const response = await fetch(
          `${this.serverUrl}/project/${this.userId}`,
          {
            method: 'POST',
            body: formData,
          },
        );

        const data = await response.json();

        if (!data.success) {
          console.log(`❌ Failed to upload ${file.name}:`, data.error);
          return false;
        }
      }

      console.log('✅ Multiple file upload test passed');
      console.log('📤 Files uploaded:', files.length);
      return true;
    } catch (error) {
      console.log('❌ Multiple file upload test error:', error);
      return false;
    }
  },

  /**
   * Esegue tutti i test in sequenza
   */
  async runAllTests() {
    console.log('🚀 Starting Project Manager tests...');

    const results = {
      projectCreation: false,
      projectListing: false,
      fileDeletion: false,
    };

    // Test 1: Creazione progetto
    results.projectCreation = await this.testProjectCreation();

    // Test 2: Lista progetti
    results.projectListing = await this.testProjectListing();

    // Test 3: Eliminazione file (solo se il progetto esiste)
    if (results.projectCreation) {
      results.fileDeletion = await this.testFileDelection(
        'Test Project',
        'README.md',
      );
    }

    // Riepilogo risultati
    console.log('\n📊 Test Results Summary:');
    console.log('Project Creation:', results.projectCreation ? '✅' : '❌');
    console.log('Project Listing:', results.projectListing ? '✅' : '❌');
    console.log('File Deletion:', results.fileDeletion ? '✅' : '❌');

    const allPassed = Object.values(results).every((result) => result);
    console.log(
      '\n🏆 Overall result:',
      allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED',
    );

    return results;
  },
};

// Esportazione per l'uso nei test automatizzati
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PROJECT_MANAGER_TESTS;
}

// Auto-esecuzione se lanciato direttamente nel browser
if (typeof window !== 'undefined') {
  console.log(
    'Project Manager Test Suite loaded. Run PROJECT_MANAGER_TESTS.runAllTests() to start testing.',
  );
}
