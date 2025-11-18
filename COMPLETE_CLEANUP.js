/**
 * COMPLETE CLEANUP SCRIPT
 * Run this in the Excalidraw page console to completely reset everything
 * This will delete ALL old data and force a fresh start
 */

(async function completeCleanup() {
    console.log('%c🧹 COMPLETE CLEANUP STARTING', 'background: #ef4444; color: white; padding: 10px; font-size: 16px; font-weight: bold;');

    const results = [];

    // Step 1: Delete IndexedDB
    console.log('\n📋 Step 1: Deleting IndexedDB...');
    try {
        const dbName = 'ExcalidrawSyncDB';
        const deleteRequest = indexedDB.deleteDatabase(dbName);

        await new Promise((resolve, reject) => {
            deleteRequest.onsuccess = () => {
                console.log('✅ IndexedDB deleted successfully');
                results.push({ step: 'IndexedDB', success: true });
                resolve();
            };
            deleteRequest.onerror = () => {
                console.error('❌ Failed to delete IndexedDB');
                results.push({ step: 'IndexedDB', success: false, error: deleteRequest.error });
                reject(deleteRequest.error);
            };
            deleteRequest.onblocked = () => {
                console.warn('⚠️ IndexedDB deletion blocked - close all tabs using it');
                results.push({ step: 'IndexedDB', success: false, error: 'Blocked' });
                reject(new Error('Deletion blocked'));
            };
        });
    } catch (error) {
        console.error('❌ Error deleting IndexedDB:', error);
    }

    // Step 2: Clear Chrome Storage (extension data)
    console.log('\n📋 Step 2: Clearing Chrome Storage...');
    try {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            await chrome.storage.local.clear();
            console.log('✅ Chrome storage cleared');
            results.push({ step: 'Chrome Storage', success: true });
        } else {
            console.warn('⚠️ Chrome storage API not available');
            results.push({ step: 'Chrome Storage', success: false, error: 'API not available' });
        }
    } catch (error) {
        console.error('❌ Error clearing Chrome storage:', error);
        results.push({ step: 'Chrome Storage', success: false, error: error.message });
    }

    // Step 3: Clear any cached data
    console.log('\n📋 Step 3: Clearing cache...');
    try {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            console.log(`✅ Cleared ${cacheNames.length} caches`);
            results.push({ step: 'Cache', success: true, count: cacheNames.length });
        } else {
            console.log('ℹ️ Cache API not available');
            results.push({ step: 'Cache', success: true, note: 'Not available' });
        }
    } catch (error) {
        console.error('❌ Error clearing cache:', error);
        results.push({ step: 'Cache', success: false, error: error.message });
    }

    // Step 4: Send message to background to clear its state
    console.log('\n📋 Step 4: Notifying background worker...');
    try {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            // Send a message to background to clear any in-memory state
            await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    type: 'CLEAR_ALL_DATA',
                    timestamp: Date.now()
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.warn('⚠️ Background worker response:', chrome.runtime.lastError.message);
                    } else {
                        console.log('✅ Background notified');
                    }
                    resolve();
                });
            });
            results.push({ step: 'Background Worker', success: true });
        }
    } catch (error) {
        console.error('❌ Error notifying background:', error);
        results.push({ step: 'Background Worker', success: false, error: error.message });
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('%c✅ CLEANUP COMPLETE', 'background: #10b981; color: white; padding: 10px; font-size: 16px; font-weight: bold;');
    console.log('='.repeat(80));

    console.log('\n📊 Summary:');
    results.forEach(r => {
        const icon = r.success ? '✅' : '❌';
        console.log(`${icon} ${r.step}`);
    });

    console.log('\n📋 NEXT STEPS:');
    console.log('1. Go to chrome://extensions/');
    console.log('2. Find "Excalidraw Sync" and click the RELOAD (↻) button');
    console.log('3. Come back to this tab and HARD REFRESH (Cmd+Shift+R or Ctrl+Shift+R)');
    console.log('4. Draw something new');
    console.log('5. Check the background worker console for the NEW UUID');
    console.log('\n⚠️ IMPORTANT: You MUST reload the extension and refresh this page!');

    return results;
})();
