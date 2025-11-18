/**
 * CONSOLE TEST SCRIPT
 * Copy and paste this entire script into the Excalidraw page console
 * It will test the entire sync flow step by step
 */

(async function testExcalidrawSync() {
    console.log('%c🔍 Starting Excalidraw Sync Test', 'background: #667eea; color: white; padding: 10px; font-size: 16px; font-weight: bold;');

    const results = {
        step1: null,
        step2: null,
        step3: null,
        step4: null,
        step5: null,
        step6: null
    };

    // STEP 1: Check Chrome APIs
    console.log('\n📋 STEP 1: Checking Chrome Extension APIs...');
    try {
        const chromeAvailable = typeof chrome !== 'undefined';
        const runtimeAvailable = typeof chrome?.runtime !== 'undefined';
        const idAvailable = chrome?.runtime?.id !== undefined;
        const sendMessageAvailable = typeof chrome?.runtime?.sendMessage === 'function';

        results.step1 = {
            success: chromeAvailable && runtimeAvailable && idAvailable && sendMessageAvailable,
            chromeAvailable,
            runtimeAvailable,
            idAvailable,
            sendMessageAvailable,
            extensionId: chrome?.runtime?.id
        };

        console.log('✅ Chrome APIs:', results.step1);
    } catch (error) {
        results.step1 = { success: false, error: error.message };
        console.error('❌ Step 1 failed:', error);
    }

    // STEP 2: Check Injected Script (MAIN world)
    console.log('\n📋 STEP 2: Checking Injected Script (MAIN world)...');
    try {
        const injectedAvailable = typeof window.excalidrawSyncDebug !== 'undefined';

        if (!injectedAvailable) {
            throw new Error('Injected script not available');
        }

        const allData = window.excalidrawSyncDebug.getAllData();
        const dataKeys = Object.keys(allData);

        results.step2 = {
            success: true,
            injectedAvailable: true,
            excalidrawKeysFound: dataKeys.length,
            keys: dataKeys,
            data: allData
        };

        console.log('✅ Injected Script:', results.step2);
    } catch (error) {
        results.step2 = { success: false, error: error.message };
        console.error('❌ Step 2 failed:', error);
    }

    // STEP 3: Check Content Script (ISOLATED world)
    console.log('\n📋 STEP 3: Checking Content Script (ISOLATED world)...');
    try {
        const contentAvailable = typeof window.excalidrawSyncContent !== 'undefined';

        if (!contentAvailable) {
            throw new Error('Content script not available');
        }

        const status = window.excalidrawSyncContent.status();

        results.step3 = {
            success: true,
            contentAvailable: true,
            status
        };

        console.log('✅ Content Script:', results.step3);
    } catch (error) {
        results.step3 = { success: false, error: error.message };
        console.error('❌ Step 3 failed:', error);
    }

    // STEP 4: Extract Diagram Data
    console.log('\n📋 STEP 4: Extracting Diagram Data...');
    try {
        if (!results.step2.success) {
            throw new Error('Injected script not available');
        }

        const diagram = window.excalidrawSyncDebug.extractDiagram();

        if (!diagram) {
            throw new Error('No diagram data found. Try drawing something first!');
        }

        results.step4 = {
            success: true,
            diagramFound: true,
            elementsCount: diagram.elements?.length || 0,
            activeElements: diagram.elements?.filter(e => !e.isDeleted)?.length || 0,
            diagramType: diagram.type,
            diagramVersion: diagram.version,
            diagramPreview: {
                type: diagram.type,
                version: diagram.version,
                elementsCount: diagram.elements?.length || 0,
                hasAppState: !!diagram.appState,
                hasFiles: !!diagram.files
            }
        };

        console.log('✅ Diagram Data:', results.step4);
        console.log('📊 Full Diagram Object:', diagram);
    } catch (error) {
        results.step4 = { success: false, error: error.message };
        console.error('❌ Step 4 failed:', error);
    }

    // STEP 5: Test Message Sending
    console.log('\n📋 STEP 5: Testing Message to Background...');
    try {
        if (!results.step1.success) {
            throw new Error('Chrome APIs not available');
        }

        // Send GET_DIAGRAMS message
        const response = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Message timeout - no response from background'));
            }, 5000);

            chrome.runtime.sendMessage({
                type: 'GET_DIAGRAMS',
                payload: null,
                timestamp: Date.now()
            }, (response) => {
                clearTimeout(timeout);
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });

        results.step5 = {
            success: true,
            messageDelivered: true,
            response,
            diagramsInDB: response?.diagrams?.length || 0
        };

        console.log('✅ Message Sent:', results.step5);
        console.log('📨 Background Response:', response);
    } catch (error) {
        results.step5 = { success: false, error: error.message };
        console.error('❌ Step 5 failed:', error);
    }

    // STEP 6: Force Sync Test
    console.log('\n📋 STEP 6: Testing Force Sync...');
    try {
        if (!results.step3.success || !results.step4.success) {
            throw new Error('Prerequisites not met for sync test');
        }

        console.log('🔄 Triggering force sync...');
        window.excalidrawSyncDebug.forceCheck();

        // Wait a bit for the sync to process
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check if diagram was saved
        const checkResponse = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                type: 'GET_DIAGRAMS',
                payload: null,
                timestamp: Date.now()
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });

        results.step6 = {
            success: true,
            syncTriggered: true,
            diagramsAfterSync: checkResponse?.diagrams?.length || 0,
            diagrams: checkResponse?.diagrams
        };

        console.log('✅ Force Sync:', results.step6);
        console.log('📊 Diagrams After Sync:', checkResponse);
    } catch (error) {
        results.step6 = { success: false, error: error.message };
        console.error('❌ Step 6 failed:', error);
    }

    // FINAL SUMMARY
    console.log('\n' + '='.repeat(80));
    console.log('%c📊 TEST SUMMARY', 'background: #667eea; color: white; padding: 10px; font-size: 16px; font-weight: bold;');
    console.log('='.repeat(80));

    const allSteps = Object.entries(results);
    const passedSteps = allSteps.filter(([_, result]) => result?.success).length;
    const totalSteps = allSteps.length;

    allSteps.forEach(([step, result]) => {
        const icon = result?.success ? '✅' : '❌';
        const name = step.toUpperCase();
        console.log(`${icon} ${name}:`, result?.success ? 'PASSED' : `FAILED - ${result?.error || 'Unknown error'}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`RESULT: ${passedSteps}/${totalSteps} tests passed`);
    console.log('='.repeat(80));

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');

    if (!results.step1.success) {
        console.log('❌ Chrome extension APIs not available');
        console.log('   → Reload the extension at chrome://extensions/');
        console.log('   → Refresh this page with Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)');
    }

    if (!results.step2.success) {
        console.log('❌ Injected script (MAIN world) not loaded');
        console.log('   → Check manifest.json has "world": "MAIN" in content_scripts');
        console.log('   → Rebuild: npm run build');
        console.log('   → Reload extension and refresh page');
    }

    if (!results.step3.success) {
        console.log('❌ Content script (ISOLATED world) not loaded');
        console.log('   → Check manifest.json content_scripts configuration');
        console.log('   → Rebuild: npm run build');
        console.log('   → Reload extension and refresh page');
    }

    if (results.step4.success && !results.step4.diagramFound) {
        console.log('⚠️  No diagram data found');
        console.log('   → Draw something on the canvas first');
        console.log('   → Wait a few seconds for Excalidraw to auto-save');
    }

    if (!results.step5.success) {
        console.log('❌ Cannot communicate with background script');
        console.log('   → Check background service worker is running');
        console.log('   → Go to chrome://extensions/ and click "service worker"');
        console.log('   → Look for errors in the background console');
    }

    if (results.step6.success && results.step6.diagramsAfterSync === 0) {
        console.log('⚠️  Sync triggered but no diagrams saved');
        console.log('   → Check background worker console for errors');
        console.log('   → Check IndexedDB in Application tab');
        console.log('   → There might be an error during save process');
    }

    console.log('\n📖 Full results object available as: window.testResults');
    window.testResults = results;

    return results;
})();
