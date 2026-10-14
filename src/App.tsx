/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DemoScenarioBar } from './components/DemoScenarioBar';
import { AccessDeniedModal } from './components/Modals/AccessDeniedModal';
import { ChatbotWidget } from './components/ChatbotWidget';
import { WorkQueueScreen } from './screens/WorkQueueScreen';
import { IntakeUploadScreen } from './screens/IntakeUploadScreen';
import { ReviewScreen } from './screens/ReviewScreen';
import { VoucherPreviewScreen } from './screens/VoucherPreviewScreen';
import { AuditTrailScreen } from './screens/AuditTrailScreen';
import { DEMO_USERS, INITIAL_INVOICES } from './services/mockData';
import { InvoiceDocument, UserProfile } from './types';
import {
  auth,
  loginWithGoogle,
  logoutFirebase,
  saveInvoiceToFirestore,
  subscribeToInvoices,
  seedInitialInvoicesIfEmpty,
} from './services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export default function App() {
  // Global Invoices state
  const [invoices, setInvoices] = useState<InvoiceDocument[]>(INITIAL_INVOICES);

  // Active User role
  // Default to User C (Finance Reviewer Dewi Lestari) for immediate demo inspectability
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEMO_USERS[3]);

  // Firebase Auth state
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  // Active Screen (1: WorkQueue, 2: Upload, 3: Review, 4: Voucher, 5: Audit)
  const [activeScreen, setActiveScreen] = useState<number>(1);

  // Selected Invoice for inspection in Review / Voucher
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDocument>(INITIAL_INVOICES[0]);

  // Demo Day Active Scenario Highlight
  const [activeScenario, setActiveScenario] = useState<number | null>(null);

  // Access Denied Modal state (Scenario 6)
  const [accessDeniedState, setAccessDeniedState] = useState<{
    isOpen: boolean;
    targetClientName: string;
    targetInvoiceNumber: string;
  }>({
    isOpen: false,
    targetClientName: '',
    targetInvoiceNumber: '',
  });

  // Track Firebase Auth state & Real-time Firestore sync (Strictly Auth-Guarded)
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | undefined;

    // 1. Auth listener
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        // Only attach onSnapshot and seed when auth is ready and user is authenticated
        seedInitialInvoicesIfEmpty(INITIAL_INVOICES);
        unsubscribeFirestore = subscribeToInvoices((syncedInvoices) => {
          if (syncedInvoices && syncedInvoices.length > 0) {
            setInvoices(syncedInvoices);
            setSelectedInvoice((prev) => {
              const match = syncedInvoices.find((i) => i.id === prev.id);
              return match || syncedInvoices[0];
            });
          }
        });
      } else {
        if (unsubscribeFirestore) {
          unsubscribeFirestore();
          unsubscribeFirestore = undefined;
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  // Calculate summary counts for navigation badges
  const queueCounts = {
    total: invoices.length,
    readyForReview: invoices.filter((i) => i.status === 'READY_FOR_REVIEW').length,
    exception: invoices.filter((i) => i.status === 'EXCEPTION').length,
    completed: invoices.filter((i) => i.status === 'AMIGA_REVIEWED' || i.status === 'SENT_TO_CLIENT').length,
  };

  // Reset to initial demo seed state
  const handleResetData = async () => {
    setInvoices(INITIAL_INVOICES);
    setSelectedInvoice(INITIAL_INVOICES[0]);
    setActiveScenario(null);

    // Also persist initial invoices back into Firestore
    for (const inv of INITIAL_INVOICES) {
      await saveInvoiceToFirestore(inv);
    }
    alert('Data simulasi AMIGA Robot Admin berhasil di-reset dan disinkronkan ke Firestore.');
  };

  // Switch Active User (Role Switcher)
  const handleSwitchUser = (user: UserProfile) => {
    setCurrentUser(user);

    // If current selected invoice does not belong to user's client, reset to first accessible doc
    if (user.clientId.startsWith('CLIENT')) {
      const clientDoc = invoices.find((i) => i.clientId === user.clientId);
      if (clientDoc) setSelectedInvoice(clientDoc);
    }
  };

  // Google Login & Logout handlers
  const handleGoogleLogin = async () => {
    try {
      const user = await loginWithGoogle();
      setFirebaseUser(user);
    } catch (err: any) {
      console.warn('Google login status note:', err?.message || err);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logoutFirebase();
      setFirebaseUser(null);
    } catch (err: any) {
      console.warn('Google logout note:', err?.message || err);
    }
  };

  // When a new invoice is uploaded & extracted in Screen 02
  const handleInvoiceCreated = (newInv: InvoiceDocument) => {
    setInvoices([newInv, ...invoices]);
    setSelectedInvoice(newInv);
    // Persist to Firestore database
    saveInvoiceToFirestore(newInv);
  };

  // When an invoice is updated or approved in Screen 03 or 04
  const handleUpdateInvoice = (updated: InvoiceDocument) => {
    setInvoices(invoices.map((i) => (i.id === updated.id ? updated : i)));
    setSelectedInvoice(updated);
    // Persist update to Firestore database
    saveInvoiceToFirestore(updated);
  };

  // Open Access Denied Modal
  const handleTriggerAccessDenied = (clientName: string, invNum: string) => {
    setAccessDeniedState({
      isOpen: true,
      targetClientName: clientName,
      targetInvoiceNumber: invNum,
    });
  };

  // Scenario 1 - 7 Quick Trigger Handler for MAIN Hackathon Judges
  const handleSelectScenario = (scenarioNum: number) => {
    setActiveScenario(scenarioNum);

    switch (scenarioNum) {
      case 1: {
        // Scenario 1: Normal Flow
        const doc = invoices.find((i) => i.id === 'inv-001') || invoices[0];
        setSelectedInvoice(doc);
        setCurrentUser(DEMO_USERS[3]); // Finance Reviewer
        setActiveScreen(3); // Screen 03 Review
        break;
      }
      case 2: {
        // Scenario 2: Multi-line Items
        const doc = invoices.find((i) => i.id === 'inv-002') || invoices[1];
        setSelectedInvoice(doc);
        setCurrentUser(DEMO_USERS[3]);
        setActiveScreen(3);
        break;
      }
      case 3: {
        // Scenario 3: Missing Evidence (Bank account missing)
        const doc = invoices.find((i) => i.id === 'inv-003') || invoices[2];
        setSelectedInvoice(doc);
        setCurrentUser(DEMO_USERS[3]);
        setActiveScreen(3);
        break;
      }
      case 4: {
        // Scenario 4: Duplicate Detection
        const doc = invoices.find((i) => i.id === 'inv-004') || invoices[3];
        setSelectedInvoice(doc);
        setCurrentUser(DEMO_USERS[3]);
        setActiveScreen(3);
        break;
      }
      case 5: {
        // Scenario 5: Segregation of Duties
        const userA = DEMO_USERS[0];
        const doc = invoices.find((i) => i.id === 'inv-005') || invoices[4];
        setCurrentUser(userA);
        setSelectedInvoice(doc);
        setActiveScreen(3);
        break;
      }
      case 6: {
        // Scenario 6: Multi-Client Security
        setCurrentUser(DEMO_USERS[0]); // PT Maju Jaya
        setActiveScreen(1); // Back to queue
        const docClientB = invoices.find((i) => i.clientId === 'CLIENT-002');
        handleTriggerAccessDenied(
          docClientB?.clientName || 'PT Nusantara Sejahtera',
          docClientB?.invoiceNumber || 'INV/2026/DNS-019'
        );
        break;
      }
      case 7: {
        // Scenario 7: Audit Traceability
        const docWithEdits = invoices.find((i) => i.id === 'inv-001') || invoices[0];
        setSelectedInvoice(docWithEdits);
        setActiveScreen(5); // Jump directly to Screen 05 Audit Trail
        break;
      }
      default:
        setActiveScreen(1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Header with Role Switcher, Google Auth, DB Status & 5 Tabs Navigation */}
      <Header
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        activeScreen={activeScreen}
        onNavigateScreen={setActiveScreen}
        onResetData={handleResetData}
        queueCounts={queueCounts}
        firebaseUser={firebaseUser}
        onLoginGoogle={handleGoogleLogin}
        onLogoutFirebase={handleGoogleLogout}
      />

      {/* Demo Day 7 Acceptance Test Quick-Selector Bar */}
      <DemoScenarioBar
        onSelectScenario={handleSelectScenario}
        activeScenario={activeScenario}
        currentUser={currentUser}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-16">
        {activeScreen === 1 && (
          <WorkQueueScreen
            invoices={invoices}
            currentUser={currentUser}
            onSelectInvoiceForReview={(inv) => {
              setSelectedInvoice(inv);
              setActiveScreen(3);
            }}
            onSelectInvoiceForVoucher={(inv) => {
              setSelectedInvoice(inv);
              setActiveScreen(4);
            }}
            onSelectInvoiceForAudit={(inv) => {
              setSelectedInvoice(inv);
              setActiveScreen(5);
            }}
            onNavigateToUpload={() => setActiveScreen(2)}
            onTriggerAccessDenied={handleTriggerAccessDenied}
          />
        )}

        {activeScreen === 2 && (
          <IntakeUploadScreen
            currentUser={currentUser}
            existingInvoices={invoices}
            onInvoiceCreated={handleInvoiceCreated}
            onNavigateToReview={(inv) => {
              setSelectedInvoice(inv);
              setActiveScreen(3);
            }}
          />
        )}

        {activeScreen === 3 && (
          <ReviewScreen
            invoice={selectedInvoice}
            allInvoices={invoices}
            currentUser={currentUser}
            onSelectInvoice={setSelectedInvoice}
            onUpdateInvoice={handleUpdateInvoice}
            onNavigateToVoucher={(inv) => {
              setSelectedInvoice(inv);
              setActiveScreen(4);
            }}
          />
        )}

        {activeScreen === 4 && (
          <VoucherPreviewScreen
            invoice={selectedInvoice}
            currentUser={currentUser}
            onUpdateInvoice={handleUpdateInvoice}
            onBackToReview={() => setActiveScreen(3)}
          />
        )}

        {activeScreen === 5 && (
          <AuditTrailScreen
            invoices={invoices}
            currentUser={currentUser}
            selectedInvoiceId={selectedInvoice.id}
          />
        )}
      </main>

      {/* AMIGA Robot Copilot AI Chatbot */}
      <ChatbotWidget
        invoices={invoices}
        currentUser={currentUser}
        onNavigateToInvoice={(invId) => {
          const target = invoices.find((i) => i.id === invId || i.requestId === invId);
          if (target) {
            setSelectedInvoice(target);
            setActiveScreen(3);
          }
        }}
      />

      {/* Multi-Client Isolation Modal (Scenario 6) */}
      <AccessDeniedModal
        isOpen={accessDeniedState.isOpen}
        onClose={() =>
          setAccessDeniedState({
            isOpen: false,
            targetClientName: '',
            targetInvoiceNumber: '',
          })
        }
        currentUser={currentUser}
        targetClientName={accessDeniedState.targetClientName}
        targetInvoiceNumber={accessDeniedState.targetInvoiceNumber}
      />
    </div>
  );
}
