import { services } from '../data/services.js';
import {
  auth, db, signOut,
  collection, getDocs, getDoc, doc, updateDoc, addDoc,
  query, orderBy, where, onSnapshot, serverTimestamp, setDoc,
  changePassword, getCachedProducts
} from '../firebase.js';

let unsubInquiries = null;
let unsubOrders = null;
let unsubAlerts = null;
let unsubPartners = null;
let currentInquiries = [];
let currentOrders = [];
let currentPartners = [];
let selectedInquiryId = null;
let inboxSearchQuery = '';

export function renderAdmin() {
  return `
    <div class="admin-layout">
      <!-- HIGH-FIDELITY CSS INJECTION -->
      <style>
        .admin-layout {
          display: flex;
          background: #110702 !important;
          color: #FBF3E3 !important;
          min-height: 100vh;
          font-family: 'Montserrat', sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        /* Gold glowing sidebar */
        .admin-sidebar {
          width: 250px;
          background: rgba(22, 9, 3, 0.95);
          border-right: 1.5px solid rgba(200, 146, 42, 0.15);
          display: flex;
          flex-direction: column;
          padding: 36px 16px;
          height: 100vh;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 100;
        }

        .admin-sidebar-logo {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 48px;
          padding-bottom: 24px;
          border-bottom: 1px solid rgba(200, 146, 42, 0.1);
        }

        .admin-logo-text-large {
          font-family: 'Playfair Display', serif;
          font-size: 44px;
          font-weight: 900;
          color: #E0B050;
          letter-spacing: 3px;
          background: linear-gradient(135deg, #E0B050, #C8922A);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 2px 8px rgba(200, 146, 42, 0.25));
        }

        .admin-nav {
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex: 1;
        }

        .admin-nav-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 20px;
          color: rgba(251, 243, 227, 0.6);
          border-radius: 12px;
          font-family: 'Montserrat', sans-serif;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.3s ease;
          background: transparent;
          border: 1px solid transparent;
          width: 100%;
          cursor: pointer;
          text-align: left;
          outline: none;
        }

        .admin-nav-item svg {
          color: rgba(200, 146, 42, 0.6);
          transition: all 0.3s ease;
        }

        .admin-nav-item:hover {
          color: #FBF3E3;
          background: rgba(200, 146, 42, 0.06);
        }

        .admin-nav-item.active {
          background: rgba(26, 12, 3, 0.7);
          border: 1.5px solid rgba(200, 146, 42, 0.35);
          color: #E0B050;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05);
          font-weight: 600;
          position: relative;
        }

        /* Sidebar vertical active indicator */
        .admin-nav-item.active::before {
          content: '';
          position: absolute;
          left: -16px;
          top: 50%;
          transform: translateY(-50%);
          width: 4px;
          height: 32px;
          background: #E0B050;
          border-radius: 0 4px 4px 0;
          box-shadow: 0 0 10px #E0B050, 0 0 20px #C8922A;
        }

        .admin-nav-item.active svg {
          color: #E0B050;
          filter: drop-shadow(0 0 4px #E0B050);
        }

        .admin-sidebar-footer {
          margin-top: auto;
          border-top: 1px solid rgba(200, 146, 42, 0.1);
          padding-top: 20px;
        }

        .admin-logout-btn {
          color: rgba(255, 107, 107, 0.7) !important;
        }
        .admin-logout-btn:hover {
          background: rgba(255, 107, 107, 0.08) !important;
          color: #ff6b6b !important;
        }
        .admin-logout-btn svg {
          color: rgba(255, 107, 107, 0.7) !important;
        }

        /* Mobile Header */
        .admin-mobile-header {
          display: none;
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 60px;
          background: rgba(26,12,3,0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1.5px solid rgba(200,146,42,0.15);
          z-index: 1050 !important;
          align-items: center;
          padding: 0 24px;
          gap: 16px;
        }
        .admin-mobile-toggle {
          background: none; border: none; color: #FBF3E3; cursor: pointer; padding: 4px;
          flex-shrink: 0;
        }
        .admin-mobile-title {
          font-family: 'Montserrat', sans-serif;
          font-size: 14px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #E0B050;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Main Workspace Container */
        .admin-main {
          flex: 1;
          margin-left: 250px;
          padding: 56px 48px;
          background: #110702;
          min-height: 100vh;
        }

        .admin-panel {
          display: none;
        }

        .admin-panel.active {
          display: block;
          animation: adminPanelFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes adminPanelFade {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Greetings Header */
        .admin-page-greeting-row {
          margin-bottom: 40px;
        }

        .admin-greeting-text {
          font-family: 'Playfair Display', serif;
          font-size: 34px;
          font-weight: 400;
          color: #FBF3E3;
          letter-spacing: 0.5px;
        }

        .admin-greeting-text span {
          font-weight: 700;
          color: #E0B050;
          position: relative;
          display: inline-block;
        }

        .admin-greeting-text span::after {
          content: '';
          position: absolute;
          bottom: -6px;
          left: 0;
          width: 100%;
          height: 2.5px;
          background: linear-gradient(90deg, #C8922A, #E0B050, transparent);
          box-shadow: 0 1.5px 5px rgba(224, 176, 80, 0.45);
        }

        /* Four Stat Grid Cards */
        .admin-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 32px;
        }

        .admin-card-stat {
          background: rgba(26, 12, 3, 0.55);
          border: 1px solid rgba(200, 146, 42, 0.16);
          border-radius: 16px;
          padding: 24px 24px 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(12px);
          transition: all 0.3s ease;
        }

        .admin-card-stat:hover {
          transform: translateY(-2px);
          border-color: rgba(224, 176, 80, 0.35);
          box-shadow: 0 12px 40px rgba(200, 146, 42, 0.15);
        }

        .admin-card-stat::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, #C8922A, #E0B050);
        }

        .stat-label-elite {
          font-family: 'Montserrat', sans-serif;
          font-size: 11px;
          color: rgba(251, 243, 227, 0.55);
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 12px;
        }

        .stat-num-elite {
          font-family: 'Montserrat', sans-serif;
          font-size: 38px;
          font-weight: 700;
          color: #FBF3E3;
          line-height: 1;
          margin-bottom: 12px;
        }

        /* SVG Sparklines styles */
        .sparkline-svg {
          width: 100%;
          height: 48px;
          stroke: #E0B050;
          fill: none;
          stroke-width: 2.5;
          stroke-linecap: round;
          overflow: visible;
          filter: drop-shadow(0 2px 4px rgba(224, 176, 80, 0.2));
        }

        /* Split row trends */
        .admin-split-grid {
          display: grid;
          grid-template-columns: 1.8fr 1.2fr;
          gap: 24px;
          margin-bottom: 32px;
        }

        .admin-section-card-elite {
          background: rgba(26, 12, 3, 0.45);
          border: 1px solid rgba(200, 146, 42, 0.12);
          border-radius: 20px;
          padding: 30px;
          backdrop-filter: blur(16px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.3);
        }

        .admin-card-title-elite {
          font-family: 'Montserrat', sans-serif;
          font-size: 16px;
          font-weight: 600;
          color: #FBF3E3;
          letter-spacing: 1px;
          margin-bottom: 24px;
        }

        /* Donut Chart visual styles */
        .donut-wrap {
          position: relative;
          width: 180px;
          height: 180px;
          margin: 0 auto 24px;
        }
        .donut-svg {
          transform: rotate(-90deg);
        }
        .donut-segment {
          fill: none;
          stroke-width: 10;
          stroke-linecap: round;
          transition: stroke-dashoffset 0.3s ease;
        }

        .legend-grid-elite {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px 20px;
          margin-top: 16px;
          padding: 0 8px;
        }
        .legend-item-elite {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: rgba(251, 243, 227, 0.7);
        }
        .legend-dot-elite {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* Recent Inquiries Table */
        .admin-table-elite-card {
          background: rgba(26, 12, 3, 0.45);
          border: 1px solid rgba(200, 146, 42, 0.12);
          border-radius: 20px;
          padding: 32px;
          backdrop-filter: blur(16px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.3);
          overflow-x: auto;
        }

        .admin-table-title-elite {
          font-family: 'Montserrat', sans-serif;
          font-size: 18px;
          font-weight: 600;
          color: #FBF3E3;
          letter-spacing: 1px;
          margin-bottom: 24px;
        }

        .table-elite {
          width: 100%;
          border-collapse: collapse;
        }

        .table-elite th {
          text-align: left;
          font-family: 'Montserrat', sans-serif;
          font-size: 11px;
          font-weight: 600;
          color: rgba(251, 243, 227, 0.4);
          letter-spacing: 1.5px;
          text-transform: uppercase;
          padding: 14px 20px;
          border-bottom: 1px solid rgba(200, 146, 42, 0.1);
        }

        .table-elite td {
          padding: 16px 20px;
          font-family: 'Montserrat', sans-serif;
          font-size: 13.5px;
          color: rgba(251, 243, 227, 0.85);
          border-bottom: 1px solid rgba(200, 146, 42, 0.05);
        }

        .table-elite tbody tr {
          transition: all 0.2s ease;
        }

        .table-elite tbody tr:hover {
          background: rgba(224, 176, 80, 0.03);
        }

        .pill-status {
          display: inline-block;
          padding: 6px 16px;
          border-radius: 30px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          text-align: center;
        }

        .pill-active {
          border: 1.5px solid rgba(224, 176, 80, 0.6);
          background: rgba(224, 176, 80, 0.08);
          color: #E0B050;
          box-shadow: 0 0 12px rgba(224, 176, 80, 0.15);
        }

        .pill-pending {
          border: 1.5px solid rgba(255, 107, 107, 0.6);
          background: rgba(255, 107, 107, 0.08);
          color: #ff6b6b;
          box-shadow: 0 0 12px rgba(255, 107, 107, 0.15);
        }

        .pill-delivered {
          border: 1.5px solid rgba(125, 236, 160, 0.6);
          background: rgba(125, 236, 160, 0.08);
          color: #7deca0;
          box-shadow: 0 0 12px rgba(125, 236, 160, 0.15);
        }

        /* Modal elements */
        .admin-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 24px;
        }
        .admin-modal {
          background: linear-gradient(160deg, #1A0C03, #2E1503);
          border: 1px solid rgba(200, 146, 42, 0.15);
          border-radius: 20px;
          padding: 32px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.5);
        }
        .admin-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        .admin-modal-header h2 {
          font-family: 'Playfair Display', serif;
          font-size: 22px;
          color: #FBF3E3 !important;
        }
        .admin-modal-close {
          background: none; border: none;
          font-size: 28px; color: #DEC89A !important;
          cursor: pointer;
          transition: color 0.2s;
        }
        .admin-modal-close:hover { color: #FFFFFF !important; }
        .admin-modal-form .admin-form-group { margin-bottom: 18px; }
        .admin-modal-form .admin-form-input {
          background: rgba(26,12,3,0.85) !important;
          border: 1.5px solid rgba(224, 176, 80, 0.25) !important;
          border-radius: 10px;
          width: 100%;
          padding: 12px 16px;
          font-family: 'Montserrat', sans-serif;
          font-size: 14px;
          color: #FFFFFF !important;
          outline: none;
        }
        .admin-modal-form .admin-form-input:focus { border-color: #E0B050 !important; }
        .admin-modal-form textarea.admin-form-input { resize: vertical; min-height: 60px; }
        .admin-modal-form select.admin-form-input option { background: #1A0C03; color: #FFFFFF !important; }
 
        .admin-action-btn-elite {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #E0B050, #C8922A) !important;
          border: none;
          border-radius: 30px;
          font-family: 'Montserrat', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #1E0E05 !important;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .admin-action-btn-elite:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(224, 176, 80, 0.35) !important; }
 
        /* Catalog grid cards */
        .admin-products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
        }
        .admin-product-card {
          background: rgba(26,12,3,0.7) !important;
          border: 1.5px solid rgba(224, 176, 80, 0.15) !important;
          border-radius: 16px;
          padding: 24px;
          transition: border-color 0.3s, transform 0.2s;
        }
        .admin-product-card:hover { border-color: rgba(224, 176, 80, 0.35) !important; transform: translateY(-2px); }
        .admin-product-icon { font-size: 32px; margin-bottom: 12px; }
        .admin-product-name {
          font-family: 'Playfair Display', serif;
          font-size: 18px !important;
          color: #FBF3E3 !important;
          margin-bottom: 16px;
          font-weight: 700 !important;
        }
        .admin-product-controls { display: flex; flex-direction: column; gap: 14px; }
        .admin-form-label-sm {
          font-family: 'Montserrat', sans-serif;
          font-size: 9px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #DEC89A !important;
          margin-bottom: 6px;
          display: block;
          font-weight: 600 !important;
        }
        .admin-product-status-select {
          width: 100%;
          padding: 8px 12px;
          background: rgba(14,6,2,0.85) !important;
          border: 1.5px solid rgba(224, 176, 80, 0.2) !important;
          border-radius: 8px;
          color: #FFFFFF !important;
          font-family: 'Montserrat', sans-serif;
          font-size: 13px;
          outline: none;
        }
        .admin-product-status-select:focus { border-color: #E0B050 !important; }
        .admin-product-status-select option { background: #1A0C03; color: #FFFFFF !important; }
 
        /* Partner profiles card */
        .partner-card-elite {
          background: rgba(26, 12, 3, 0.45);
          border: 1px solid rgba(200, 146, 42, 0.12);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .partner-logo-elite {
          width: 52px; height: 52px;
          background: rgba(200,146,42,0.1);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
 
        .admin-toggle { position: relative; display: inline-block; width: 44px; height: 24px; }
        .admin-toggle-input { opacity: 0; width: 0; height: 0; }
        .admin-toggle-slider {
          position: absolute;
          cursor: pointer;
          inset: 0;
          background: rgba(26,12,3,0.8);
          border: 1.5px solid rgba(200,146,42,0.2);
          border-radius: 24px;
          transition: 0.3s;
        }
        .admin-toggle-slider::before {
          content: '';
          position: absolute;
          height: 18px; width: 18px;
          left: 2px; bottom: 2px;
          background: #DEC89A !important;
          border-radius: 50%;
          transition: 0.3s;
        }
        .admin-toggle-input:checked + .admin-toggle-slider { background: rgba(200,146,42,0.3); border-color: var(--gold); }
        .admin-toggle-input:checked + .admin-toggle-slider::before { transform: translateX(20px); background: #E0B050 !important; }

        @media (max-width: 1024px) {
          .admin-stat-grid { grid-template-columns: repeat(2, 1fr); }
          .admin-split-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 900px) {
          .admin-sidebar {
            transform: translateX(-100%);
            width: 260px;
            z-index: 1100 !important;
            transition: transform 0.3s ease;
          }
          .admin-sidebar.open { transform: translateX(0); box-shadow: 8px 0 40px rgba(0,0,0,0.5); }
          .admin-mobile-header { display: flex; }
          .admin-main { margin-left: 0; padding: 90px 24px 24px; }
        }

        /* ── ELITE INBOX SPLIT LAYOUT FOR INQUIRIES ── */
        .inbox-container-elite {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 24px;
          background: rgba(26, 12, 3, 0.45);
          border: 1px solid rgba(200, 146, 42, 0.12);
          border-radius: 20px;
          min-height: 580px;
          overflow: hidden;
          box-shadow: 0 12px 40px rgba(0,0,0,0.3);
          backdrop-filter: blur(16px);
        }

        .inbox-sidebar-elite {
          border-right: 1.5px solid rgba(200, 146, 42, 0.12);
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          background: rgba(14, 6, 2, 0.2);
          max-height: 580px;
        }

        .inbox-list-elite {
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow-y: auto;
          flex: 1;
          padding-right: 4px;
        }

        /* Custom Scrollbar for inbox list */
        .inbox-list-elite::-webkit-scrollbar {
          width: 5px;
        }
        .inbox-list-elite::-webkit-scrollbar-track {
          background: rgba(14, 6, 2, 0.1);
        }
        .inbox-list-elite::-webkit-scrollbar-thumb {
          background: rgba(200, 146, 42, 0.2);
          border-radius: 10px;
        }

        .inbox-item-card-elite {
          background: transparent;
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.25s ease;
          border: 1px solid transparent;
          display: flex;
          flex-direction: column;
          gap: 6px;
          text-align: left;
          border-bottom: 1px solid rgba(200, 146, 42, 0.05);
        }

        .inbox-item-card-elite:hover {
          background: rgba(200, 146, 42, 0.04);
        }

        .inbox-item-card-elite.active {
          background: rgba(26, 12, 3, 0.6) !important;
          border: 1.5px solid rgba(200, 146, 42, 0.3) !important;
          border-left: 4px solid #E0B050 !important;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .inbox-item-row-one {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .inbox-item-name {
          font-size: 14.5px;
          font-weight: 700;
          color: #FBF3E3;
          letter-spacing: 0.2px;
        }

        .inbox-item-date {
          font-size: 11px;
          color: rgba(251, 243, 227, 0.4);
          font-family: 'Montserrat', sans-serif;
        }

        .inbox-item-subject {
          font-size: 12.5px;
          color: #DEC89A;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 500;
        }

        .inbox-item-location {
          font-size: 11.5px;
          color: rgba(251, 243, 227, 0.55);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .inbox-item-status-pill {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          width: fit-content;
          margin-top: 4px;
          text-align: center;
        }

        /* Lifecyle Badge colors matching mockup and theme */
        .status-badge-pending {
          background: rgba(138, 110, 245, 0.12) !important;
          color: #8A6EF5 !important;
          border: 1.5px solid rgba(138, 110, 245, 0.35) !important;
          box-shadow: 0 0 10px rgba(138, 110, 245, 0.1);
        }
        .status-badge-rejected {
          background: rgba(255, 107, 107, 0.12) !important;
          color: #ff6b6b !important;
          border: 1.5px solid rgba(255, 107, 107, 0.35) !important;
        }
        .status-badge-pending_review {
          background: rgba(224, 176, 80, 0.12) !important;
          color: #E0B050 !important;
          border: 1.5px solid rgba(224, 176, 80, 0.35) !important;
        }
        .status-badge-quote_sent {
          background: rgba(200, 146, 42, 0.15) !important;
          color: #DEC89A !important;
          border: 1.5px solid rgba(200, 146, 42, 0.35) !important;
        }
        .status-badge-confirmed {
          background: rgba(42, 180, 150, 0.12) !important;
          color: #5aecc6 !important;
          border: 1.5px solid rgba(42, 180, 150, 0.35) !important;
        }
        .status-badge-in_production {
          background: rgba(245, 158, 11, 0.12) !important;
          color: #F59E0B !important;
          border: 1.5px solid rgba(245, 158, 11, 0.35) !important;
        }
        .status-badge-shipped {
          background: rgba(59, 130, 246, 0.12) !important;
          color: #3B82F6 !important;
          border: 1.5px solid rgba(59, 130, 246, 0.35) !important;
        }
        .status-badge-installed {
          background: rgba(16, 185, 129, 0.12) !important;
          color: #10B981 !important;
          border: 1.5px solid rgba(16, 185, 129, 0.35) !important;
        }

        .inbox-details-elite {
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          background: rgba(26, 12, 3, 0.15);
          overflow-y: auto;
          max-height: 580px;
        }

        .inbox-details-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1.5px solid rgba(200, 146, 42, 0.1);
          padding-bottom: 20px;
        }

        .inbox-details-title {
          font-family: 'Playfair Display', serif;
          font-size: 24px;
          color: #FBF3E3;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .inbox-details-thread {
          font-size: 12px;
          color: rgba(251, 243, 227, 0.45);
          margin-top: 6px;
          font-family: 'Montserrat', sans-serif;
        }

        .inbox-status-select-wrap {
          position: relative;
        }

        .inbox-status-select {
          background: rgba(14, 6, 2, 0.95) !important;
          border: 1.5px solid rgba(224, 176, 80, 0.3) !important;
          border-radius: 30px !important;
          padding: 10px 36px 10px 20px !important;
          font-family: 'Montserrat', sans-serif !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          color: #E0B050 !important;
          outline: none;
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' stroke='%23E0B050' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='m3 4.5 3 3 3-3'/%3E%3C/svg%3E") !important;
          background-repeat: no-repeat !important;
          background-position: right 16px center !important;
          transition: all 0.3s ease;
          width: 170px;
        }

        .inbox-status-select:focus {
          border-color: #E0B050 !important;
          box-shadow: 0 0 15px rgba(224, 176, 80, 0.25) !important;
        }

        .inbox-status-select option {
          background: #160903 !important;
          color: #FBF3E3 !important;
          padding: 8px !important;
        }

        .sender-details-card-elite {
          background: rgba(14, 6, 2, 0.45);
          border: 1px solid rgba(200, 146, 42, 0.12);
          border-radius: 12px;
          padding: 24px;
        }

        .sender-details-title-elite {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #DEC89A;
          margin-bottom: 16px;
          font-family: 'Montserrat', sans-serif;
        }

        .sender-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px 40px;
        }

        .sender-details-field {
          font-size: 13.5px;
          color: rgba(251, 243, 227, 0.8);
          line-height: 1.5;
        }

        .sender-details-field strong {
          color: #FBF3E3;
        }

        .sender-details-field a {
          color: #E0B050;
          text-decoration: underline;
          transition: color 0.2s;
        }

        .sender-details-field a:hover {
          color: #FFFFFF;
        }

        .message-text-card-elite {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .message-text-title-elite {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: rgba(251, 243, 227, 0.4);
          font-family: 'Montserrat', sans-serif;
        }

        .message-quote-box-elite {
          background: rgba(14, 6, 2, 0.35);
          border-left: 4px solid #E0B050;
          border-radius: 4px 12px 12px 4px;
          padding: 20px 24px;
          font-size: 14.5px;
          line-height: 1.7;
          color: rgba(251, 243, 227, 0.9);
          white-space: pre-wrap;
          box-shadow: inset 0 2px 8px rgba(0,0,0,0.15);
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-style: italic;
        }

        .reply-btn-elite {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: linear-gradient(135deg, #8A6EF5, #6342E8) !important;
          color: #FFFFFF !important;
          border: none;
          border-radius: 30px;
          padding: 14px 28px;
          font-family: 'Montserrat', sans-serif;
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          cursor: pointer;
          width: fit-content;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 6px 20px rgba(99, 66, 232, 0.35);
        }

        .reply-btn-elite:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(99, 66, 232, 0.5);
        }

        .action-button-group-elite {
          display: flex;
          gap: 16px;
          margin-top: 8px;
        }

        .action-btn-accept {
          background: linear-gradient(135deg, #10B981, #059669) !important;
          color: #FFFFFF !important;
        }
        .action-btn-accept:hover {
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4) !important;
          transform: translateY(-1.5px);
        }

        .action-btn-reject {
          background: linear-gradient(135deg, #EF4444, #DC2626) !important;
          color: #FFFFFF !important;
        }
        .action-btn-reject:hover {
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4) !important;
          transform: translateY(-1.5px);
        }

        /* ── ADMIN ACTION SMALL BUTTONS ── */
        .admin-action-sm {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          font-family: 'Montserrat', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.25s ease;
          border: 1.5px solid rgba(200, 146, 42, 0.3);
          background: transparent;
        }
        .admin-action-sm:hover {
          transform: translateY(-1px);
          box-shadow: 0 3px 12px rgba(0,0,0,0.3);
        }

        /* ── CUSTOM SCROLLBAR ── */
        .admin-scrollbar::-webkit-scrollbar,
        .admin-main::-webkit-scrollbar {
          width: 6px;
        }
        .admin-scrollbar::-webkit-scrollbar-track,
        .admin-main::-webkit-scrollbar-track {
          background: rgba(14, 6, 2, 0.1);
        }
        .admin-scrollbar::-webkit-scrollbar-thumb,
        .admin-main::-webkit-scrollbar-thumb {
          background: rgba(200, 146, 42, 0.2);
          border-radius: 10px;
        }
        .admin-scrollbar::-webkit-scrollbar-thumb:hover,
        .admin-main::-webkit-scrollbar-thumb:hover {
          background: rgba(200, 146, 42, 0.35);
        }

        /* ── EMPTY STATE ── */
        .admin-empty-state {
          text-align: center;
          padding: 48px 24px;
          color: rgba(251, 243, 227, 0.35);
          font-family: 'Montserrat', sans-serif;
          font-size: 14px;
          font-style: italic;
        }

        /* ── SKELETON LOADING SHIMMER ── */
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
        .skeleton-line {
          height: 14px;
          border-radius: 6px;
          background: linear-gradient(90deg, rgba(251,243,227,0.04) 0%, rgba(251,243,227,0.08) 50%, rgba(251,243,227,0.04) 100%);
          background-size: 200px 100%;
          animation: shimmer 1.5s ease-in-out infinite;
          margin-bottom: 10px;
        }

        /* ── NOTIFICATION DOT ── */
        .nav-badge {
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 10px;
          background: linear-gradient(135deg, #E0B050, #C8922A);
          color: #1E0E05;
          font-size: 10px;
          font-weight: 800;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-left: auto;
          box-shadow: 0 0 8px rgba(224, 176, 80, 0.4);
        }

        /* ── SYNC INDICATOR ── */
        .sync-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: rgba(251, 243, 227, 0.35);
          font-family: 'Montserrat', sans-serif;
        }
        .sync-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #7deca0;
          box-shadow: 0 0 6px #7deca0;
          animation: syncPulse 2s ease-in-out infinite;
        }
        @keyframes syncPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        /* ── TABLE ROW HOVER IMPROVEMENTS ── */
        .table-elite tbody tr:hover td {
          color: #FBF3E3;
        }
        .table-elite tbody tr:nth-child(even) {
          background: rgba(251, 243, 227, 0.01);
        }
      </style>

      <!-- SIDEBAR -->
      <aside class="admin-sidebar" id="admin-sidebar">
        <div class="admin-sidebar-logo">
          <span class="admin-logo-text-large">AG</span>
          <span style="font-family: 'Montserrat', sans-serif; font-size: 9px; letter-spacing: 4px; text-transform: uppercase; color: rgba(251,243,227,0.4); margin-top: 4px;">ELITE ADMIN</span>
        </div>

        <nav class="admin-nav">
          <button class="admin-nav-item active" data-panel="dashboard" id="admin-nav-dashboard">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>Dashboard</span>
          </button>
          <button class="admin-nav-item" data-panel="inquiries" id="admin-nav-inquiries">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>Inquiries</span>
            <span class="nav-badge" id="nav-inquiries-badge" style="display:none;">0</span>
          </button>
          <button class="admin-nav-item" data-panel="catalog" id="admin-nav-catalog">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            <span>Catalog</span>
          </button>
          <button class="admin-nav-item" data-panel="partners" id="admin-nav-partners">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>Partners</span>
          </button>
          <button class="admin-nav-item" data-panel="deliveries" id="admin-nav-deliveries">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="1" y="3" width="15" height="13"/>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            <span>Deliveries</span>
          </button>
          <button class="admin-nav-item" data-panel="settings" id="admin-nav-settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span>Settings</span>
          </button>
        </nav>

        <div class="admin-sidebar-footer">
          <button class="admin-nav-item admin-logout-btn" id="admin-logout-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <!-- MOBILE HEADER -->
      <div class="admin-mobile-header" id="admin-mobile-header">
        <button class="admin-mobile-toggle" id="admin-mobile-toggle">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <span class="admin-mobile-title">Al Gani Elite</span>
      </div>

      <!-- MAIN WORKSPACE -->
      <main class="admin-main" id="admin-main">

        <!-- DASHBOARD PANEL -->
        <div class="admin-panel active" id="panel-dashboard">
          <div class="admin-page-greeting-row" style="display:flex; justify-content:space-between; align-items:center;">
            <h1 class="admin-greeting-text" id="admin-greeting-text">Good Evening, <span id="admin-greeting-name">Aftab</span></h1>
            <div class="sync-indicator" id="sync-indicator">
              <span class="sync-dot"></span>
              <span>Live · Auto-synced</span>
            </div>
          </div>

          <!-- GLOWING CRITICAL ALERTS TRAY -->
          <div id="admin-inventory-alerts-tray" style="display:none; margin-bottom:24px;"></div>

          <!-- Elite Four Stat Cards with inline glowing curves -->
          <div class="admin-stat-grid">
            <div class="admin-card-stat">
              <div class="stat-label-elite">Active Inquiries</div>
              <div class="stat-num-elite" id="stat-active-inquiries">47</div>
              <svg class="sparkline-svg" viewBox="0 0 200 50">
                <path d="M 0 45 Q 25 35, 50 40 T 100 20 T 150 35 T 200 15"/>
              </svg>
            </div>
            
            <div class="admin-card-stat">
              <div class="stat-label-elite">Quotes Sent</div>
              <div class="stat-num-elite" id="stat-quotes-sent">23</div>
              <svg class="sparkline-svg" viewBox="0 0 200 50">
                <path d="M 0 45 Q 25 40, 50 30 T 100 35 T 150 15 T 200 10"/>
              </svg>
            </div>
            
            <div class="admin-card-stat">
              <div class="stat-label-elite">Deliveries This Month</div>
              <div class="stat-num-elite" id="stat-active-orders">156</div>
              <svg class="sparkline-svg" viewBox="0 0 200 50">
                <path d="M 0 45 Q 25 25, 50 35 T 100 15 T 150 40 T 200 20"/>
              </svg>
            </div>
            
            <div class="admin-card-stat">
              <div class="stat-label-elite">Partner Organizations</div>
              <div class="stat-num-elite" id="stat-partner-organizations">12</div>
              <svg class="sparkline-svg" viewBox="0 0 200 50">
                <path d="M 0 40 Q 25 30, 50 35 T 100 25 T 150 30 T 200 15"/>
              </svg>
            </div>
          </div>

          <!-- Split charts layout -->
          <div class="admin-split-grid">
            <!-- Left Card: Inquiry Trends -->
            <div class="admin-section-card-elite">
              <div class="admin-card-title-elite">Inquiry Trends</div>
              <div style="position: relative; width: 100%;">
                <svg viewBox="0 0 500 220" width="100%" height="200" style="overflow: visible;">
                  <defs>
                    <linearGradient id="trends-glow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#E0B050" stop-opacity="0.35"/>
                      <stop offset="100%" stop-color="#C8922A" stop-opacity="0.0"/>
                    </linearGradient>
                    <filter id="trends-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  
                  <!-- Grid lines -->
                  <line x1="0" y1="180" x2="480" y2="180" stroke="rgba(251,243,227,0.05)"/>
                  <line x1="0" y1="135" x2="480" y2="135" stroke="rgba(251,243,227,0.05)"/>
                  <line x1="0" y1="90" x2="480" y2="90" stroke="rgba(251,243,227,0.05)"/>
                  <line x1="0" y1="45" x2="480" y2="45" stroke="rgba(251,243,227,0.05)"/>
                  
                  <!-- Y Axis Labels -->
                  <text x="-25" y="184" fill="rgba(251,243,227,0.4)" font-size="10">0</text>
                  <text x="-25" y="139" fill="rgba(251,243,227,0.4)" font-size="10">25</text>
                  <text x="-25" y="94" fill="rgba(251,243,227,0.4)" font-size="10">50</text>
                  <text x="-25" y="49" fill="rgba(251,243,227,0.4)" font-size="10">75</text>
                  <text x="-30" y="4" fill="rgba(251,243,227,0.4)" font-size="10">100</text>

                  <!-- Filled Gradient Area -->
                  <path d="M 0 180 C 40 130, 80 110, 120 125 C 160 140, 200 130, 240 75 C 280 20, 320 120, 360 85 C 400 50, 440 60, 480 30 L 480 180 Z" fill="url(#trends-glow)"/>
                  
                  <!-- Curved Glow Trendline -->
                  <path d="M 0 180 C 40 130, 80 110, 120 125 C 160 140, 200 130, 240 75 C 280 20, 320 120, 360 85 C 400 50, 440 60, 480 30" fill="none" stroke="#E0B050" stroke-width="3.5" stroke-linecap="round" filter="url(#trends-glow-filter)"/>
                  
                  <!-- X Axis Labels -->
                  <text x="0" y="210" fill="rgba(251,243,227,0.4)" font-size="10" text-anchor="middle">Jan</text>
                  <text x="96" y="210" fill="rgba(251,243,227,0.4)" font-size="10" text-anchor="middle">Feb</text>
                  <text x="192" y="210" fill="rgba(251,243,227,0.4)" font-size="10" text-anchor="middle">Mar</text>
                  <text x="288" y="210" fill="rgba(251,243,227,0.4)" font-size="10" text-anchor="middle">Apr</text>
                  <text x="384" y="210" fill="rgba(251,243,227,0.4)" font-size="10" text-anchor="middle">May</text>
                  <text x="480" y="210" fill="rgba(251,243,227,0.4)" font-size="10" text-anchor="middle">Jun</text>

                  <!--Glowing Dots -->
                  <circle cx="120" cy="125" r="4.5" fill="#FBF3E3" stroke="#C8922A" stroke-width="2" filter="url(#trends-glow-filter)"/>
                  <circle cx="240" cy="75" r="4.5" fill="#FBF3E3" stroke="#C8922A" stroke-width="2" filter="url(#trends-glow-filter)"/>
                  <circle cx="360" cy="85" r="4.5" fill="#FBF3E3" stroke="#C8922A" stroke-width="2" filter="url(#trends-glow-filter)"/>
                  <circle cx="480" cy="30" r="4.5" fill="#FBF3E3" stroke="#C8922A" stroke-width="2" filter="url(#trends-glow-filter)"/>
                </svg>
              </div>
            </div>

            <!-- Right Card: Service Category Donut Chart -->
            <div class="admin-section-card-elite" id="donut-chart-container">
              <div class="admin-card-title-elite">Service Category</div>
              <div class="donut-wrap">
                <svg class="donut-svg" width="180" height="180" viewBox="0 0 42 42">
                  <defs>
                    <filter id="donut-glow-filter">
                      <feGaussianBlur stdDeviation="1.5" result="blur"/>
                      <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <!-- Beekeeping: Orange (40%) -->
                  <circle class="donut-segment" cx="21" cy="21" r="15.915" stroke="#C85A2A" stroke-dasharray="40 100" stroke-dashoffset="0" filter="url(#donut-glow-filter)"></circle>
                  <!-- Paneling: Brown (30%) -->
                  <circle class="donut-segment" cx="21" cy="21" r="15.915" stroke="#8A4A1C" stroke-dasharray="30 100" stroke-dashoffset="-40" filter="url(#donut-glow-filter)"></circle>
                  <!-- Dairy: Beige (15%) -->
                  <circle class="donut-segment" cx="21" cy="21" r="15.915" stroke="#DCA86A" stroke-dasharray="15 100" stroke-dashoffset="-70" filter="url(#donut-glow-filter)"></circle>
                  <!-- IoT: Gold (15%) -->
                  <circle class="donut-segment" cx="21" cy="21" r="15.915" stroke="#E0B050" stroke-dasharray="15 100" stroke-dashoffset="-85" filter="url(#donut-glow-filter)"></circle>
                </svg>
              </div>
              
              <!-- Legend Grid -->
              <div class="legend-grid-elite">
                <div class="legend-item-elite">
                  <span class="legend-dot-elite" style="background:#C85A2A;"></span>
                  <span>Beekeeping</span>
                </div>
                <div class="legend-item-elite">
                  <span class="legend-dot-elite" style="background:#8A4A1C;"></span>
                  <span>Paneling</span>
                </div>
                <div class="legend-item-elite">
                  <span class="legend-dot-elite" style="background:#DCA86A;"></span>
                  <span>Dairy</span>
                </div>
                <div class="legend-item-elite">
                  <span class="legend-dot-elite" style="background:#E0B050;"></span>
                  <span>IoT</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Real-Time Recent Inquiries Table Card -->
          <div class="admin-table-elite-card">
            <h2 class="admin-table-title-elite">Recent Inquiries</h2>
            <div id="dashboard-inquiries-table">
              <p class="admin-empty-state">Loading B2B inquiries...</p>
            </div>
          </div>
        </div>

        <!-- INQUIRIES PANEL -->
        <div class="admin-panel" id="panel-inquiries">
          <div class="admin-header" style="display:flex; justify-content:space-between; margin-bottom:32px;">
            <h1 class="admin-page-title" style="font-family:'Playfair Display', serif; font-size:26px; color:#FBF3E3;">Customer Messages & Inquiries</h1>
          </div>
          <div class="inbox-container-elite" id="inquiries-list-full">
            <p class="admin-empty-state">Loading visitor inquiries inbox...</p>
          </div>
        </div>

        <!-- CATALOG PANEL -->
        <div class="admin-panel" id="panel-catalog">
          <div class="admin-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px;">
            <h1 class="admin-page-title" style="font-family:'Playfair Display', serif; font-size:26px; color:#FBF3E3;">Supply Catalog Status</h1>
            <button class="admin-action-btn-elite" id="btn-add-catalog">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Catalog Item
            </button>
          </div>
          <div class="admin-products-grid" id="products-grid">
            ${services.map(s => `
              <div class="admin-product-card" data-slug="${s.slug}" id="admin-product-${s.slug}">
                <div class="admin-product-icon">${s.icon}</div>
                <h3 class="admin-product-name">${s.name}</h3>
                <div class="admin-product-controls">
                  <div class="admin-product-status-wrap">
                    <label class="admin-form-label-sm">Stock Status</label>
                    <select class="admin-product-status-select" data-slug="${s.slug}">
                      <option value="in-stock">🟢 In Stock</option>
                      <option value="low-stock">🟡 Low Stock</option>
                      <option value="out-of-stock">🔴 Out of Stock</option>
                    </select>
                  </div>
                  <div class="admin-product-inventory-wrap" style="margin: 12px 0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                      <label class="admin-form-label-sm" style="margin-bottom:0;">Stock Level: <strong class="stock-num-${s.slug}">100</strong> units</label>
                    </div>
                    <div style="display:flex; gap:10px; align-items:center;">
                      <input type="range" class="admin-product-inventory-range" data-slug="${s.slug}" min="0" max="250" value="100" style="flex:1; accent-color:#E0B050;">
                      <input type="number" class="admin-product-inventory-number" data-slug="${s.slug}" min="0" max="250" value="100" style="width:50px; background:#1A0C03; border:1px solid rgba(200, 146, 42, 0.2); border-radius:4px; color:#FBF3E3; font-size:11px; padding:2px 4px; text-align:center;">
                    </div>
                  </div>
                  <div class="admin-product-threshold-wrap" style="margin: 12px 0 6px; display:flex; justify-content:space-between; align-items:center;">
                    <label class="admin-form-label-sm" style="margin-bottom:0;">Alert Threshold</label>
                    <input type="number" class="admin-product-threshold-input" data-slug="${s.slug}" min="0" max="100" value="10" style="width:50px; background:#1A0C03; border:1px solid rgba(200, 146, 42, 0.2); border-radius:4px; color:#FBF3E3; font-size:11px; padding:2px 4px; text-align:center;">
                  </div>
                  <div class="admin-product-toggle-wrap" style="display:flex; justify-content:space-between; align-items:center;">
                    <label class="admin-form-label-sm" style="margin-bottom:0;">Visible on Site</label>
                    <label class="admin-toggle">
                      <input type="checkbox" class="admin-toggle-input" data-slug="${s.slug}" checked>
                      <span class="admin-toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- PARTNERS PANEL -->
        <div class="admin-panel" id="panel-partners">
          <div class="admin-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px;">
            <h1 class="admin-page-title" style="font-family:'Playfair Display', serif; font-size:26px; color:#FBF3E3;">Recent Corporate Partners</h1>
            <button class="admin-action-btn-elite" id="btn-add-partner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Partner
            </button>
          </div>
          <div id="partners-list-full" style="display:flex; flex-direction:column; gap:20px;">
            <p class="admin-empty-state">Loading partners database...</p>
          </div>
        </div>

        <!-- DELIVERIES PANEL -->
        <div class="admin-panel" id="panel-deliveries">
          <div class="admin-header" style="display:flex; justify-content:space-between; margin-bottom:32px;">
            <h1 class="admin-page-title" style="font-family:'Playfair Display', serif; font-size:26px; color:#FBF3E3;">Deliveries & Order Tracking</h1>
            <button class="admin-action-btn-elite" id="btn-add-order">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Order Delivery
            </button>
          </div>
          <div class="admin-table-elite-card">
            <div id="orders-table-full">
              <p class="admin-empty-state">Loading active deliveries...</p>
            </div>
          </div>
        </div>

        <!-- ADD ORDER MODAL -->
        <div class="admin-modal-overlay" id="add-order-modal" style="display:none;">
          <div class="admin-modal">
            <div class="admin-modal-header">
              <h2>Add New Delivery</h2>
              <button class="admin-modal-close" id="close-order-modal">×</button>
            </div>
            <form id="add-order-form" class="admin-modal-form">
              <div class="admin-form-group">
                <label class="admin-form-label-sm">Client Name</label>
                <input type="text" id="order-client" class="admin-form-input" placeholder="Client or company name" required>
              </div>
              <div class="admin-form-group">
                <label class="admin-form-label-sm">Service / Product</label>
                <select id="order-service" class="admin-form-input" required>
                  <option value="">Select a service...</option>
                  ${services.map(s => `<option value="${s.slug}">${s.icon} ${s.name}</option>`).join('')}
                </select>
              </div>
              <div class="admin-form-group">
                <label class="admin-form-label-sm">Region</label>
                <select id="order-region" class="admin-form-input" required>
                  <option value="">Select region...</option>
                  <option value="Kashmir Valley">Kashmir Valley</option>
                  <option value="Srinagar">Srinagar</option>
                  <option value="Leh / Ladakh">Leh / Ladakh</option>
                  <option value="Baramulla">Baramulla</option>
                  <option value="Anantnag">Anantnag</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div class="admin-form-group">
                <label class="admin-form-label-sm">Notes (optional)</label>
                <textarea id="order-notes" class="admin-form-input" rows="3" placeholder="Any additional details..."></textarea>
              </div>
              <button type="submit" class="admin-action-btn-elite" style="width:100%; justify-content:center;">Create Delivery Route</button>
            </form>
          </div>
        </div>

        <!-- ADD PARTNER MODAL -->
        <div class="admin-modal-overlay" id="add-partner-modal" style="display:none;">
          <div class="admin-modal">
            <div class="admin-modal-header">
              <h2>Add Corporate Partner</h2>
              <button class="admin-modal-close" id="close-partner-modal">×</button>
            </div>
            <form id="add-partner-form" class="admin-modal-form">
              <div class="admin-form-group">
                <label class="admin-form-label-sm">Partner Name</label>
                <input type="text" id="partner-name" class="admin-form-input" placeholder="e.g. ECOCORP" required style="background: rgba(26,12,3,0.85); border: 1.5px solid rgba(224, 176, 80, 0.25); border-radius: 10px; width: 100%; padding: 12px 16px; font-family: 'Montserrat', sans-serif; font-size: 14px; color: #FFFFFF; outline: none;">
              </div>
              <div class="admin-form-group">
                <label class="admin-form-label-sm">Partner Relationship / Type</label>
                <input type="text" id="partner-type" class="admin-form-input" placeholder="e.g. Company Partner, Signed contract" required style="background: rgba(26,12,3,0.85); border: 1.5px solid rgba(224, 176, 80, 0.25); border-radius: 10px; width: 100%; padding: 12px 16px; font-family: 'Montserrat', sans-serif; font-size: 14px; color: #FFFFFF; outline: none;">
              </div>
              <div class="admin-form-group">
                <label class="admin-form-label-sm">Sector Icon / Logo Emoji</label>
                <select id="partner-logo" class="admin-form-input" required style="background: rgba(26,12,3,0.85); border: 1.5px solid rgba(224, 176, 80, 0.25); border-radius: 10px; width: 100%; padding: 12px 16px; font-family: 'Montserrat', sans-serif; font-size: 14px; color: #FFFFFF; outline: none;">
                  <option value="🌾">🌾 Agriculture / Grains</option>
                  <option value="🌱">🌱 Horticulture / Greenery</option>
                  <option value="🌐">🌐 Logistics / Global Network</option>
                  <option value="🌿">🌿 Supplements / Wellness</option>
                  <option value="🍯">🍯 Beekeeping / Honey</option>
                  <option value="🥛">🥛 Dairy / Livestock</option>
                  <option value="🏨">🏨 Hospitality / Luxury Hotels</option>
                  <option value="🏢">🏢 Real Estate / Corporate</option>
                </select>
              </div>
              <div class="admin-form-group">
                <label class="admin-form-label-sm">Initial Status</label>
                <select id="partner-status" class="admin-form-input" required style="background: rgba(26,12,3,0.85); border: 1.5px solid rgba(224, 176, 80, 0.25); border-radius: 10px; width: 100%; padding: 12px 16px; font-family: 'Montserrat', sans-serif; font-size: 14px; color: #FFFFFF; outline: none;">
                  <option value="pending">Pending Approval</option>
                  <option value="active">Active Partner</option>
                </select>
              </div>
              <button type="submit" class="admin-action-btn-elite" style="width:100%; justify-content:center;">Register Partner</button>
            </form>
          </div>
        </div>

        <!-- ADD CATALOG MODAL -->
        <div class="admin-modal-overlay" id="add-catalog-modal" style="display:none;">
          <div class="admin-modal" style="max-width: 550px;">
            <div class="admin-modal-header">
              <h2>Add Catalog Offering</h2>
              <button class="admin-modal-close" id="close-catalog-modal">×</button>
            </div>
            <form id="add-catalog-form" class="admin-modal-form" style="max-height: 70vh; overflow-y: auto; padding-right: 8px;">
              <div class="admin-form-group">
                <label class="admin-form-label-sm">Offering / Service Name</label>
                <input type="text" id="catalog-name" class="admin-form-input" placeholder="e.g. Smart Greenhouse Automation" required style="background: rgba(26,12,3,0.85); border: 1.5px solid rgba(224, 176, 80, 0.25); border-radius: 10px; width: 100%; padding: 12px 16px; font-family: 'Montserrat', sans-serif; font-size: 14px; color: #FFFFFF; outline: none;">
              </div>
              
              <div class="admin-form-group">
                <label class="admin-form-label-sm">Service Category</label>
                <select id="catalog-category" class="admin-form-input" required style="background: rgba(26,12,3,0.85); border: 1.5px solid rgba(224, 176, 80, 0.25); border-radius: 10px; width: 100%; padding: 12px 16px; font-family: 'Montserrat', sans-serif; font-size: 14px; color: #FFFFFF; outline: none;">
                  <option value="Core Supply">Core Supply</option>
                  <option value="Automated Solutions">Automated Solutions</option>
                  <option value="Specialized & Engineering">Specialized & Engineering</option>
                </select>
              </div>

              <div class="admin-form-group">
                <label class="admin-form-label-sm">Sector Icon / Emoji</label>
                <select id="catalog-icon" class="admin-form-input" required style="background: rgba(26,12,3,0.85); border: 1.5px solid rgba(224, 176, 80, 0.25); border-radius: 10px; width: 100%; padding: 12px 16px; font-family: 'Montserrat', sans-serif; font-size: 14px; color: #FFFFFF; outline: none;">
                  <option value="🪵">🪵 Wood / Paneling</option>
                  <option value="🏠">🏠 House / Flooring</option>
                  <option value="🔲">🔲 Block / Insulation</option>
                  <option value="📋">📋 Board / Supplies</option>
                  <option value="🎰">🎰 Machine / Vending</option>
                  <option value="🌾">🌾 Farm / Agriculture</option>
                  <option value="🔬">🔬 Lab / Science</option>
                  <option value="🐝">🐝 Bee / Honey</option>
                  <option value="🪑">🪑 Chair / Furniture</option>
                  <option value="📶">📶 Signal / IoT Agri</option>
                  <option value="🥛">🥛 Glass / Dairy</option>
                  <option value="🐟">🐟 Fish / Aquaculture</option>
                  <option value="⚙️">⚙️ Gear / Engineering</option>
                  <option value="❄️">❄️ Snow / Cold Storage</option>
                  <option value="📦">📦 Box / General Packaging</option>
                </select>
              </div>

              <div class="admin-form-group">
                <label class="admin-form-label-sm">Short Description</label>
                <textarea id="catalog-short-desc" class="admin-form-input" rows="2" placeholder="Brief 1-sentence catalog summary..." required style="background: rgba(26,12,3,0.85); border: 1.5px solid rgba(224, 176, 80, 0.25); border-radius: 10px; width: 100%; padding: 12px 16px; font-family: 'Montserrat', sans-serif; font-size: 14px; color: #FFFFFF; outline: none; resize: vertical;"></textarea>
              </div>

              <div class="admin-form-group">
                <label class="admin-form-label-sm">Detailed Overview Description</label>
                <textarea id="catalog-long-desc" class="admin-form-input" rows="5" placeholder="Detailed multi-paragraph description of the new B2B service and engineering specifications..." required style="background: rgba(26,12,3,0.85); border: 1.5px solid rgba(224, 176, 80, 0.25); border-radius: 10px; width: 100%; padding: 12px 16px; font-family: 'Montserrat', sans-serif; font-size: 14px; color: #FFFFFF; outline: none; resize: vertical;"></textarea>
              </div>

              <div class="admin-form-group">
                <label class="admin-form-label-sm">Key Features (One feature per line)</label>
                <textarea id="catalog-features" class="admin-form-input" rows="4" placeholder="e.g. Real-time temperature automation&#10;Integrated sub-zero solar power backup&#10;Heavy-duty corrosion-proof frame" required style="background: rgba(26,12,3,0.85); border: 1.5px solid rgba(224, 176, 80, 0.25); border-radius: 10px; width: 100%; padding: 12px 16px; font-family: 'Montserrat', sans-serif; font-size: 14px; color: #FFFFFF; outline: none; resize: vertical;"></textarea>
              </div>

              <div class="admin-form-group" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div>
                  <label class="admin-form-label-sm">Initial Stock Level</label>
                  <input type="number" id="catalog-stock-count" class="admin-form-input" min="0" max="250" value="100" required style="background: rgba(26,12,3,0.85); border: 1.5px solid rgba(224, 176, 80, 0.25); border-radius: 10px; width: 100%; padding: 12px 16px; font-family: 'Montserrat', sans-serif; font-size: 14px; color: #FFFFFF; outline: none;">
                </div>
                <div>
                  <label class="admin-form-label-sm">Low-Stock Alert Threshold</label>
                  <input type="number" id="catalog-stock-threshold" class="admin-form-input" min="0" max="100" value="10" required style="background: rgba(26,12,3,0.85); border: 1.5px solid rgba(224, 176, 80, 0.25); border-radius: 10px; width: 100%; padding: 12px 16px; font-family: 'Montserrat', sans-serif; font-size: 14px; color: #FFFFFF; outline: none;">
                </div>
              </div>

              <button type="submit" class="admin-action-btn-elite" style="width:100%; justify-content:center; margin-top: 12px;">Create Service & Catalog Item</button>
            </form>
          </div>
        </div>

        <!-- SETTINGS PANEL -->
        <div class="admin-panel" id="panel-settings">
          <div class="admin-header" style="display:flex; justify-content:space-between; margin-bottom:32px;">
            <h1 class="admin-page-title" style="font-family:'Playfair Display', serif; font-size:26px; color:#FBF3E3;">System Settings</h1>
          </div>
          <div class="admin-table-elite-card">
            <h3 style="font-size:16px; font-weight:600; color:#FBF3E3; margin-bottom:16px;">General Configurations</h3>
            <p style="font-size:14px; color:rgba(251,243,227,0.6); line-height:1.6; margin-bottom:24px;">Configure your Al Gani Elite distribution dashboard metrics, regions, and administration parameters.</p>
            
            <div style="display:flex; flex-direction:column; gap:20px;">
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(200,146,42,0.1); padding-bottom:16px;">
                <div>
                  <h4 style="font-size:14px; font-weight:600; color:#FBF3E3;">Email Alerts</h4>
                  <p style="font-size:12px; color:rgba(251,243,227,0.4); margin-top:4px;">Receive direct notifications upon new customer inquiry submission</p>
                </div>
                <label class="admin-toggle">
                  <input type="checkbox" class="admin-toggle-input" id="settings-email-alerts" checked>
                  <span class="admin-toggle-slider"></span>
                </label>
              </div>
              
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(200,146,42,0.1); padding-bottom:16px;">
                <div>
                  <h4 style="font-size:14px; font-weight:600; color:#FBF3E3;">Real-time Firestore Sync</h4>
                  <p style="font-size:12px; color:rgba(251,243,227,0.4); margin-top:4px;">Enable immediate, socket-backed updates for active deliveries feed</p>
                </div>
                <label class="admin-toggle">
                  <input type="checkbox" class="admin-toggle-input" id="settings-realtime-sync" checked>
                  <span class="admin-toggle-slider"></span>
                </label>
              </div>
              
              <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:8px;">
                <div>
                  <h4 style="font-size:14px; font-weight:600; color:#FBF3E3;">Debug Mode</h4>
                  <p style="font-size:12px; color:rgba(251,243,227,0.4); margin-top:4px;">Print database transaction and socket handshakes in browser log</p>
                </div>
                <label class="admin-toggle">
                  <input type="checkbox" class="admin-toggle-input" id="settings-debug-mode">
                  <span class="admin-toggle-slider"></span>
                </label>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(200,146,42,0.1); padding-top:16px; padding-bottom:8px;">
                <div>
                  <h4 style="font-size:14px; font-weight:600; color:#FBF3E3;">Export Data Reports</h4>
                  <p style="font-size:12px; color:rgba(251,243,227,0.4); margin-top:4px;">Download all B2B inquiries and deliveries as Excel-friendly CSV files</p>
                </div>
                <div style="display:flex; gap:10px;">
                  <button id="btn-export-inquiries" class="admin-action-sm" style="border-color:#E0B050; color:#E0B050; padding: 8px 16px; border-radius: 20px; font-size: 11px; cursor: pointer;">Export Inquiries</button>
                  <button id="btn-export-orders" class="admin-action-sm" style="border-color:#E0B050; color:#E0B050; padding: 8px 16px; border-radius: 20px; font-size: 11px; cursor: pointer;">Export Deliveries</button>
                </div>
              </div>
            </div>
          </div>

          <div class="admin-table-elite-card" style="margin-top:24px;">
            <h3 style="font-size:16px; font-weight:600; color:#FBF3E3; margin-bottom:16px;">Security Configurations</h3>
            <p style="font-size:14px; color:rgba(251,243,227,0.6); line-height:1.6; margin-bottom:20px;">Change your administrator login security credentials.</p>
            
            <form id="settings-password-form" style="max-width:400px; display:flex; flex-direction:column; gap:14px;">
              <div style="display:flex; flex-direction:column; gap:6px;">
                <label class="admin-form-label-sm" style="margin-bottom:0;">Current Password</label>
                <input type="password" id="pw-current" required style="background: rgba(14,6,2,0.85); border: 1.5px solid rgba(224, 176, 80, 0.2); border-radius: 8px; padding: 8px 12px; color: #FFFFFF; font-size: 13px; outline: none;" placeholder="••••••••">
              </div>
              <div style="display:flex; flex-direction:column; gap:6px;">
                <label class="admin-form-label-sm" style="margin-bottom:0;">New Password</label>
                <input type="password" id="pw-new" required style="background: rgba(14,6,2,0.85); border: 1.5px solid rgba(224, 176, 80, 0.2); border-radius: 8px; padding: 8px 12px; color: #FFFFFF; font-size: 13px; outline: none;" placeholder="Minimum 6 characters">
              </div>
              <button type="submit" class="admin-action-btn-elite" style="width:fit-content; margin-top:6px; padding: 10px 20px; font-size: 11px;">Update Password</button>
              <div id="password-feedback" style="font-size: 12px; margin-top: 4px; display: none;"></div>
            </form>
          </div>
        </div>

      </main>
    </div>
  `;
}

export function initAdmin() {
  const user = auth.currentUser;
  if (!user) return;

  // Set greeting name and dynamic time-based greeting
  const greetNameEl = document.getElementById('admin-greeting-name');
  if (greetNameEl) {
    greetNameEl.textContent = user.displayName || user.email.split('@')[0] || 'Aftab';
  }
  const greetTextEl = document.getElementById('admin-greeting-text');
  if (greetTextEl && greetNameEl) {
    const hour = new Date().getHours();
    let greeting = 'Good Evening';
    if (hour < 12) greeting = 'Good Morning';
    else if (hour < 17) greeting = 'Good Afternoon';
    greetTextEl.innerHTML = `${greeting}, <span id="admin-greeting-name">${greetNameEl.textContent}</span>`;
  }

  // Sidebar navigation panel switching
  document.querySelectorAll('.admin-nav-item[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
      
      const panel = document.getElementById(`panel-${btn.dataset.panel}`);
      if (panel) panel.classList.add('active');
      
      // Close mobile sidebar on toggle
      document.getElementById('admin-sidebar')?.classList.remove('open');
    });
  });

  // Mobile sidebar toggle
  const mobileToggle = document.getElementById('admin-mobile-toggle');
  const sidebar = document.getElementById('admin-sidebar');
  mobileToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar?.classList.toggle('open');
  });

  // Close sidebar on click outside
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 900 && sidebar?.classList.contains('open')) {
      const isClickInsideSidebar = sidebar.contains(e.target);
      const isClickOnToggle = mobileToggle?.contains(e.target);
      if (!isClickInsideSidebar && !isClickOnToggle) {
        sidebar.classList.remove('open');
      }
    }
  });

  // Logout trigger
  document.getElementById('admin-logout-btn')?.addEventListener('click', async () => {
    await signOut(auth);
    window.location.hash = '#/admin/login';
  });

  // Add Delivery modal overlay trigger
  const addOrderBtn = document.getElementById('btn-add-order');
  const orderModal = document.getElementById('add-order-modal');
  const closeModal = document.getElementById('close-order-modal');

  addOrderBtn?.addEventListener('click', () => {
    orderModal.style.display = 'flex';
  });
  closeModal?.addEventListener('click', () => {
    orderModal.style.display = 'none';
  });
  orderModal?.addEventListener('click', (e) => {
    if (e.target === orderModal) orderModal.style.display = 'none';
  });

  // Add Delivery submit form
  document.getElementById('add-order-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const client = document.getElementById('order-client').value.trim();
    const service = document.getElementById('order-service').value;
    const region = document.getElementById('order-region').value;
    const notes = document.getElementById('order-notes').value.trim();

    try {
      await addDoc(collection(db, 'orders'), {
        clientName: client,
        service: service,
        region: region,
        notes: notes,
        status: 'new',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      orderModal.style.display = 'none';
      e.target.reset();
    } catch (err) {
      console.error('Error adding delivery route:', err);
    }
  });

  // Add Partner submit form
  document.getElementById('add-partner-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('partner-name').value.trim();
    const type = document.getElementById('partner-type').value.trim();
    const logo = document.getElementById('partner-logo').value;
    const status = document.getElementById('partner-status').value;

    try {
      await addDoc(collection(db, 'partners'), {
        name,
        type,
        logo,
        status
      });
      document.getElementById('add-partner-modal').style.display = 'none';
      e.target.reset();
    } catch (err) {
      console.error('Error registering corporate partner:', err);
    }
  });

  // Add Partner modal overlay trigger
  const addPartnerBtn = document.getElementById('btn-add-partner');
  const partnerModal = document.getElementById('add-partner-modal');
  const closePartnerModal = document.getElementById('close-partner-modal');

  addPartnerBtn?.addEventListener('click', () => {
    partnerModal.style.display = 'flex';
  });
  closePartnerModal?.addEventListener('click', () => {
    partnerModal.style.display = 'none';
  });
  partnerModal?.addEventListener('click', (e) => {
    if (e.target === partnerModal) partnerModal.style.display = 'none';
  });

  // Add Catalog modal overlay trigger
  const addCatalogBtn = document.getElementById('btn-add-catalog');
  const catalogModal = document.getElementById('add-catalog-modal');
  const closeCatalogModal = document.getElementById('close-catalog-modal');

  addCatalogBtn?.addEventListener('click', () => {
    catalogModal.style.display = 'flex';
  });
  closeCatalogModal?.addEventListener('click', () => {
    catalogModal.style.display = 'none';
  });
  catalogModal?.addEventListener('click', (e) => {
    if (e.target === catalogModal) catalogModal.style.display = 'none';
  });

  // Add Catalog submit form
  document.getElementById('add-catalog-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('catalog-name').value.trim();
    const category = document.getElementById('catalog-category').value;
    const icon = document.getElementById('catalog-icon').value;
    const shortDesc = document.getElementById('catalog-short-desc').value.trim();
    const longDesc = document.getElementById('catalog-long-desc').value.trim();
    
    // Parse features (one per line)
    const features = document.getElementById('catalog-features').value
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
      
    // Generate high-fidelity mockup-aligned gallery captions dynamically
    const gallery = [
      { caption: `Premium ${name} setup in an active regional facility` },
      { caption: `Custom engineered ${name} component details` },
      { caption: `B2B batch inspection and quality control of ${name}` }
    ];

    const inventoryCount = parseInt(document.getElementById('catalog-stock-count').value) || 100;
    const lowStockThreshold = parseInt(document.getElementById('catalog-stock-threshold').value) || 10;

    try {
      const res = await fetch('/api/custom-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          icon,
          shortDesc,
          longDesc,
          features,
          gallery,
          inventoryCount,
          lowStockThreshold
        })
      });

      if (res.ok) {
        catalogModal.style.display = 'none';
        e.target.reset();
        
        // Fully reload the page to reload database offerings and refresh all elements seamlessly
        window.location.reload();
      } else {
        const errData = await res.json();
        alert(`❌ Failed to create catalog offering: ${errData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error adding catalog offering:', err);
      alert('❌ Failed to connect to server to add catalog offering.');
    }
  });

  // Catalog item stock status change
  document.querySelectorAll('.admin-product-status-select').forEach(select => {
    select.addEventListener('change', async () => {
      const slug = select.dataset.slug;
      try {
        await setDoc(doc(db, 'products', slug), { stockStatus: select.value }, { merge: true });
        await getCachedProducts(true);
      } catch (err) {
        console.error('Error updating stock status:', err);
      }
    });
  });

  // Catalog item visibility switch
  document.querySelectorAll('.admin-toggle-input').forEach(toggle => {
    toggle.addEventListener('change', async () => {
      const slug = toggle.dataset.slug;
      try {
        await setDoc(doc(db, 'products', slug), { visible: toggle.checked }, { merge: true });
        await getCachedProducts(true);
      } catch (err) {
        console.error('Error updating product visibility:', err);
      }
    });
  });

  // Catalog item inventory range/number sync changes
  document.querySelectorAll('.admin-product-inventory-range').forEach(range => {
    const slug = range.dataset.slug;
    const numInput = document.querySelector(`.admin-product-inventory-number[data-slug="${slug}"]`);
    const stockSpan = document.querySelector(`.stock-num-${slug}`);
    
    const updateInventory = async (value) => {
      const parsedVal = parseInt(value) || 0;
      if (stockSpan) stockSpan.textContent = parsedVal;
      if (numInput) numInput.value = parsedVal;
      if (range) range.value = parsedVal;
      
      const threshInput = document.querySelector(`.admin-product-threshold-input[data-slug="${slug}"]`);
      const thresholdVal = threshInput ? (parseInt(threshInput.value) || 10) : 10;
      
      let newStatus = 'in-stock';
      if (parsedVal === 0) {
        newStatus = 'out-of-stock';
      } else if (parsedVal <= thresholdVal) {
        newStatus = 'low-stock';
      }
      
      const selectStatus = document.querySelector(`.admin-product-status-select[data-slug="${slug}"]`);
      if (selectStatus) selectStatus.value = newStatus;
      
      try {
        await setDoc(doc(db, 'products', slug), { 
          inventoryCount: parsedVal, 
          stockStatus: newStatus 
        }, { merge: true });
        await getCachedProducts(true);
      } catch (err) {
        console.error('Error saving product inventory:', err);
      }
    };
    
    range.addEventListener('input', (e) => {
      if (stockSpan) stockSpan.textContent = e.target.value;
      if (numInput) numInput.value = e.target.value;
    });
    
    range.addEventListener('change', (e) => {
      updateInventory(e.target.value);
    });
    
    if (numInput) {
      numInput.addEventListener('change', (e) => {
        updateInventory(e.target.value);
      });
    }
  });

  // Catalog item threshold change
  document.querySelectorAll('.admin-product-threshold-input').forEach(threshInput => {
    threshInput.addEventListener('change', async () => {
      const slug = threshInput.dataset.slug;
      const parsedVal = parseInt(threshInput.value) || 0;
      
      const rangeInput = document.querySelector(`.admin-product-inventory-range[data-slug="${slug}"]`);
      const currentVal = rangeInput ? (parseInt(rangeInput.value) || 100) : 100;
      
      let newStatus = 'in-stock';
      if (currentVal === 0) {
        newStatus = 'out-of-stock';
      } else if (currentVal <= parsedVal) {
        newStatus = 'low-stock';
      }
      
      const selectStatus = document.querySelector(`.admin-product-status-select[data-slug="${slug}"]`);
      if (selectStatus) selectStatus.value = newStatus;
      
      try {
        await setDoc(doc(db, 'products', slug), { 
          lowStockThreshold: parsedVal,
          stockStatus: newStatus
        }, { merge: true });
        await getCachedProducts(true);
      } catch (err) {
        console.error('Error saving low-stock threshold:', err);
      }
    });
  });

  // Load settings from localStorage
  const emailAlerts = localStorage.getItem('settings_email_alerts') !== 'false';
  const realtimeSync = localStorage.getItem('settings_realtime_sync') !== 'false';
  const debugMode = localStorage.getItem('settings_debug_mode') === 'true';

  const emailAlertsEl = document.getElementById('settings-email-alerts');
  const realtimeSyncEl = document.getElementById('settings-realtime-sync');
  const debugModeEl = document.getElementById('settings-debug-mode');

  if (emailAlertsEl) {
    emailAlertsEl.checked = emailAlerts;
    emailAlertsEl.addEventListener('change', () => {
      localStorage.setItem('settings_email_alerts', emailAlertsEl.checked);
    });
  }
  if (realtimeSyncEl) {
    realtimeSyncEl.checked = realtimeSync;
    realtimeSyncEl.addEventListener('change', () => {
  localStorage.setItem('settings_realtime_sync', realtimeSyncEl.checked);
    });
  }
  if (debugModeEl) {
    debugModeEl.checked = debugMode;
    debugModeEl.addEventListener('change', () => {
      localStorage.setItem('settings_debug_mode', debugModeEl.checked);
    });
  }

  // CSV Cell escaping and formatting helpers for Excel
  const escapeCSVCell = (val) => {
    if (val === null || val === undefined) return '""';
    let str = String(val).trim();
    str = str.replace(/[\r\n]+/g, ' ; '); // Replace linebreaks with semicolon to protect row count in Excel
    str = str.replace(/"/g, '""'); // Double quotes escaping
    return `"${str}"`;
  };

  const formatCSVDate = (dateStr) => {
    if (!dateStr) return '""';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return escapeCSVCell(dateStr);
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const dy = String(d.getDate()).padStart(2, '0');
      const hr = String(d.getHours()).padStart(2, '0');
      const mn = String(d.getMinutes()).padStart(2, '0');
      return `"${yr}-${mo}-${dy} ${hr}:${mn}"`;
    } catch (e) {
      return escapeCSVCell(dateStr);
    }
  };

  const formatCSVStatus = (status) => {
    if (!status) return '"Pending Review"';
    const s = String(status).toLowerCase().trim();
    if (s === 'pending') return '"Pending Review"';
    if (s === 'read') return '"Reviewed"';
    if (s === 'quote_sent') return '"Quote Sent"';
    if (s === 'confirmed') return '"Inquiry Confirmed"';
    if (s === 'accepted') return '"Accepted (Active)"';
    if (s === 'rejected') return '"Archived/Declined"';
    if (s === 'new') return '"New Route Ordered"';
    if (s === 'approved') return '"Approved Delivery"';
    if (s === 'shipped' || s === 'delivered') return '"Delivered"';
    return `"${status.charAt(0).toUpperCase() + status.slice(1)}"`;
  };

  // CSV Export for Inquiries
  document.getElementById('btn-export-inquiries')?.addEventListener('click', () => {
    if (currentInquiries.length === 0) {
      alert('No inquiries data available to export.');
      return;
    }
    
    const headers = ['Inquiry ID', 'Name', 'Email', 'Phone', 'Subject', 'Service Interested', 'Location / Territory', 'Message Text', 'Lifecycle Status', 'Submission Date'];
    const rows = currentInquiries.map(inq => {
      const svc = services.find(s => s.slug === inq.service);
      const svcName = svc ? svc.name : (inq.service || 'None');
      return [
        escapeCSVCell(inq.id),
        escapeCSVCell(inq.name),
        escapeCSVCell(inq.email),
        escapeCSVCell(inq.phone || 'Not provided'),
        escapeCSVCell(inq.subject),
        escapeCSVCell(svcName),
        escapeCSVCell(inq.location || 'Kashmir/Leh Regional'),
        escapeCSVCell(inq.message),
        formatCSVStatus(inq.status),
        formatCSVDate(inq.createdAt)
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AlGani_B2B_Inquiries_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });

  // CSV Export for Deliveries
  document.getElementById('btn-export-orders')?.addEventListener('click', () => {
    if (currentOrders.length === 0) {
      alert('No deliveries data available to export.');
      return;
    }
    
    const headers = ['Delivery ID', 'Client Name', 'B2B Offering', 'Operating Region', 'Fulfillment Status', 'Operational Notes', 'Order Timestamp'];
    const rows = currentOrders.map(ord => {
      const svc = services.find(s => s.slug === ord.service);
      const svcName = svc ? svc.name : ord.service;
      return [
        escapeCSVCell(ord.id),
        escapeCSVCell(ord.clientName),
        escapeCSVCell(svcName),
        escapeCSVCell(ord.region),
        formatCSVStatus(ord.status),
        escapeCSVCell(ord.notes || 'No notes added'),
        formatCSVDate(ord.createdAt)
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AlGani_B2B_Deliveries_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });

  // Password reset form handler
  document.getElementById('settings-password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('pw-current').value;
    const newPassword = document.getElementById('pw-new').value;
    const feedback = document.getElementById('password-feedback');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (newPassword.length < 6) {
      if (feedback) {
        feedback.textContent = '❌ New password must be at least 6 characters.';
        feedback.style.color = '#ff6b6b';
        feedback.style.display = 'block';
      }
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';

    try {
      await changePassword(auth.currentUser.email, currentPassword, newPassword);
      if (feedback) {
        feedback.textContent = '✨ Password updated successfully!';
        feedback.style.color = '#7deca0';
        feedback.style.display = 'block';
      }
      e.target.reset();
    } catch (err) {
      console.error(err);
      if (feedback) {
        feedback.textContent = `❌ ${err.message || 'Error updating password.'}`;
        feedback.style.color = '#ff6b6b';
        feedback.style.display = 'block';
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Update Password';
    }
  });

  // Load product status parameters from Firestore
  loadProductStatuses();

  // Subscribe to real-time streams
  subscribeToOrders();
  subscribeToInquiries();
  setupInventoryAlertsListener();
  subscribeToPartners();
}

// ── FIRESTORE ORDER DELIVERIES ROUTING SUBSCRIPTION ──
function subscribeToOrders() {
  if (unsubOrders) unsubOrders();

  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  unsubOrders = onSnapshot(q, (snapshot) => {
    const orders = [];
    snapshot.forEach(d => orders.push({ id: d.id, ...d.data() }));
    currentOrders = orders;
    renderOrdersTable(orders);
    updateDashboardStats();
  }, (err) => {
    console.error('Orders subscription error:', err);
  });
}

function renderOrdersTable(orders) {
  const tableHTML = orders.length === 0 ? `<p class="admin-empty-state">No deliveries set up yet. Click "Add Order Delivery" to schedule.</p>` : `
    <table class="table-elite" style="width:100%;">
      <thead>
        <tr>
          <th>Delivery ID</th>
          <th>Client</th>
          <th>Offering</th>
          <th>Operating Territory</th>
          <th>Status</th>
          <th>Fulfillment Actions</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(order => {
          const svc = services.find(s => s.slug === order.service);
          const svcName = svc ? svc.name : order.service;
          const svcIcon = svc ? svc.icon : '📦';
          
          let statusBadge = `<span class="pill-status pill-pending">new</span>`;
          if (order.status === 'approved') statusBadge = `<span class="pill-status pill-active">Active</span>`;
          if (order.status === 'shipped' || order.status === 'delivered') statusBadge = `<span class="pill-status pill-delivered">Delivered</span>`;

          return `
            <tr>
              <td style="font-family:monospace; font-size:11px; opacity:0.6;">${order.id.slice(0, 8)}...</td>
              <td><strong>${order.clientName || '—'}</strong></td>
              <td>${svcIcon} ${svcName}</td>
              <td>${order.region || '—'}</td>
              <td>${statusBadge}</td>
              <td style="display:flex; gap:8px; align-items:center;">
                ${order.status === 'new' ? `<button class="admin-action-sm admin-approve-btn" data-id="${order.id}">Approve</button>` : ''}
                ${order.status === 'approved' ? `<button class="admin-action-sm admin-ship-btn" data-id="${order.id}">Ship</button>` : ''}
                ${(order.status === 'shipped' || order.status === 'delivered') ? `<span style="font-size:12px; color:#7deca0;">✓ Complete</span>` : ''}
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  const fullTable = document.getElementById('orders-table-full');
  if (fullTable) fullTable.innerHTML = tableHTML;

  // Re-attach approval / shipping button action handlers
  document.querySelectorAll('.admin-approve-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await updateDoc(doc(db, 'orders', btn.dataset.id), { status: 'approved', updatedAt: serverTimestamp() });
    });
  });
  document.querySelectorAll('.admin-ship-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await updateDoc(doc(db, 'orders', btn.dataset.id), { status: 'delivered', updatedAt: serverTimestamp() });
    });
  });
}

// ── FIRESTORE VISITOR INQUIRIES SUBSCRIPTION ──

function subscribeToInquiries() {
  if (unsubInquiries) unsubInquiries();

  const q = query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'));
  unsubInquiries = onSnapshot(q, (snapshot) => {
    const inquiries = [];
    snapshot.forEach(d => inquiries.push({ id: d.id, ...d.data() }));
    currentInquiries = inquiries;
    renderInquiries(inquiries);
    updateDashboardStats();
  }, (err) => {
    console.error('Inquiries subscription error:', err);
  });
}

// ── REAL-TIME CRITICAL INVENTORY ALERTS SUBSCRIPTION ──
function setupInventoryAlertsListener() {
  if (unsubAlerts) unsubAlerts();

  const q = collection(db, 'alerts');
  unsubAlerts = onSnapshot(q, (snapshot) => {
    const alerts = [];
    snapshot.forEach(docRef => {
      const data = docRef.data();
      alerts.push({ id: docRef.id, ...data });
    });
    
    const unreadAlerts = alerts.filter(a => a.status === 'unread');
    const tray = document.getElementById('admin-inventory-alerts-tray');
    if (!tray) return;
    
    if (unreadAlerts.length === 0) {
      tray.style.display = 'none';
      return;
    }
    
    tray.style.display = 'block';
    tray.innerHTML = `
      <div style="background:linear-gradient(135deg, rgba(168,32,32,0.85), rgba(92,10,10,0.95)); border: 1.5px solid rgba(224,176,80,0.3); border-radius:12px; padding:16px 20px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); display:flex; flex-direction:column; gap:12px; position:relative; overflow:hidden; animation: pulseAlertGlow 3s infinite alternate;">
        <div style="position:absolute; width:150px; height:150px; background:rgba(224,176,80,0.06); border-radius:50%; top:-75px; right:-75px; filter:blur(20px);"></div>
        
        <div style="display:flex; justify-content:space-between; align-items:center; z-index:1;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:18px; animation: ringBell 2s infinite;">🔔</span>
            <span style="font-family:'Montserrat', sans-serif; font-size:13px; font-weight:700; color:#E0B050; letter-spacing:1.5px; text-transform:uppercase;">Critical Stock Alerts (${unreadAlerts.length})</span>
          </div>
          <button id="btn-dismiss-all-alerts" style="background:transparent; border:none; color:rgba(251,243,227,0.6); font-family:'Montserrat', sans-serif; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; cursor:pointer; padding:4px 8px; border-radius:4px; transition:all 0.2s;" onmouseover="this.style.color='#FBF3E3'; this.style.background='rgba(255,255,255,0.1)';" onmouseout="this.style.color='rgba(251,243,227,0.6)'; this.style.background='transparent';">Mark All Read</button>
        </div>
        
        <div style="display:flex; flex-direction:column; gap:8px; z-index:1;">
          ${unreadAlerts.map(alert => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.25); border-left:4px solid #E0B050; border-radius:4px; padding:10px 14px; gap:16px;">
              <div style="flex:1;">
                <p style="font-family:'Montserrat', sans-serif; font-size:12px; font-weight:500; color:#FBF3E3; line-height:1.4; margin:0;">${alert.message}</p>
                <span style="font-size:10px; color:rgba(251,243,227,0.4); display:block; margin-top:4px;">Notified Supplier: ${alert.emailSentTo} • ${getTimeAgo(alert.createdAt)}</span>
              </div>
              <button class="admin-alert-dismiss-btn" data-id="${alert.id}" style="background:rgba(255,255,255,0.08); border:1px solid rgba(251,243,227,0.15); border-radius:4px; color:#FBF3E3; font-family:'Montserrat', sans-serif; font-size:10px; font-weight:600; padding:4px 8px; cursor:pointer; white-space:nowrap; transition:all 0.2s;" onmouseover="this.style.background='#E0B050'; this.style.color='#110702';" onmouseout="this.style.background='rgba(255,255,255,0.08)'; this.style.color='#FBF3E3';">Dismiss</button>
            </div>
          `).join('')}
        </div>
      </div>
      
      <style>
        @keyframes pulseAlertGlow {
          0% { box-shadow: 0 0 10px rgba(168,32,32,0.2); }
          100% { box-shadow: 0 0 25px rgba(168,32,32,0.5); }
        }
        @keyframes ringBell {
          0%, 100% { transform: rotate(0); }
          15% { transform: rotate(15deg); }
          30% { transform: rotate(-15deg); }
          45% { transform: rotate(10deg); }
          60% { transform: rotate(-10deg); }
          75% { transform: rotate(4deg); }
          90% { transform: rotate(-4deg); }
        }
      </style>
    `;
    
    tray.querySelectorAll('.admin-alert-dismiss-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const alertId = btn.dataset.id;
        try {
          await fetch(`/api/alerts/${alertId}/read`, { method: 'PUT' });
        } catch (err) {
          console.error('Error dismissing alert:', err);
        }
      });
    });
    
    const dismissAllBtn = document.getElementById('btn-dismiss-all-alerts');
    if (dismissAllBtn) {
      dismissAllBtn.addEventListener('click', async () => {
        const dismissPromises = unreadAlerts.map(alert => 
          fetch(`/api/alerts/${alert.id}/read`, { method: 'PUT' })
        );
        try {
          await Promise.all(dismissPromises);
        } catch (err) {
          console.error('Error dismissing all alerts:', err);
        }
      });
    }
  }, (err) => {
    console.error('Alerts subscription error:', err);
  });
}

// ── REAL-TIME CORPORATE PARTNERS SUBSCRIPTION ──
function subscribeToPartners() {
  if (unsubPartners) unsubPartners();

  const q = collection(db, 'partners');
  unsubPartners = onSnapshot(q, (snapshot) => {
    const partners = [];
    snapshot.forEach(d => partners.push({ id: d.id, ...d.data() }));
    currentPartners = partners;
    renderPartners(partners);
    updateDashboardStats();
  }, (err) => {
    console.error('Partners subscription error:', err);
  });
}

function renderPartners(partners) {
  const container = document.getElementById('partners-list-full');
  if (!container) return;
  
  if (partners.length === 0) {
    container.innerHTML = `<p class="admin-empty-state">No corporate partners registered yet.</p>`;
    return;
  }
  
  container.innerHTML = partners.map(p => {
    const isActive = p.status === 'active';
    return `
      <div class="partner-card-elite" id="partner-card-${p.id}" style="display:flex; align-items:center; background:rgba(26,12,3,0.4); border:1.5px solid rgba(200,146,42,0.1); border-radius:12px; padding:20px; transition:all 0.3s; position:relative; gap:16px;">
        <div class="partner-logo-elite" style="font-size:24px; width:48px; height:48px; display:flex; align-items:center; justify-content:center; background:rgba(224,176,80,0.08); border:1px solid rgba(224,176,80,0.15); border-radius:10px;">${p.logo || '🌐'}</div>
        <div>
          <h3 style="font-size:16px; font-weight:600; color:#FBF3E3; margin:0;">${p.name}</h3>
          <p style="font-size:13px; color:rgba(251,243,227,0.5); margin:4px 0 0 0;">${p.type || 'B2B Partner'} · ${p.timeAgo || 'Recent'}</p>
        </div>
        
        <div style="margin-left:auto; display:flex; align-items:center; gap:14px;">
          ${isActive ? `
            <span class="pill-status pill-active">ACTIVE PARTNER</span>
          ` : `
            <button class="pill-status pill-pending admin-partner-approve-btn" data-id="${p.id}" style="cursor:pointer; outline:none; transition:all 0.2s;" onmouseover="this.style.background='rgba(255,107,107,0.2)';" onmouseout="this.style.background='rgba(255,107,107,0.08)';">PENDING APPROVAL</button>
          `}
          
          <button class="admin-partner-delete-btn" data-id="${p.id}" style="background:transparent; border:1px solid rgba(255,107,107,0.2); color:#ff6b6b; padding:8px; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s;" onmouseover="this.style.background='rgba(255,107,107,0.1)'; this.style.borderColor='#ff6b6b';" onmouseout="this.style.background='transparent'; this.style.borderColor='rgba(255,107,107,0.2)';">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  container.querySelectorAll('.admin-partner-approve-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      try {
        await fetch(`/api/partners/${id}/approve`, { method: 'PUT' });
      } catch (err) {
        console.error('Error approving partner:', err);
      }
    });
  });
  
  container.querySelectorAll('.admin-partner-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (confirm("Are you sure you want to remove this corporate partner organization?")) {
        try {
          await fetch(`/api/partners/${id}`, { method: 'DELETE' });
        } catch (err) {
          console.error('Error deleting partner:', err);
        }
      }
    });
  });
}

function renderInquiries(msgs) {
  const inquiriesListFull = document.getElementById('inquiries-list-full');
  
  // Filter out soft-deleted inquiries from inbox list
  const activeMsgs = msgs.filter(msg => !msg.isDeleted);

  if (activeMsgs.length === 0) {
    if (inquiriesListFull) inquiriesListFull.innerHTML = `<p class="admin-empty-state">No inquiries received yet.</p>`;
  } else {
    // Apply search filter if active
    const filteredMsgs = activeMsgs.filter(msg => {
      if (!inboxSearchQuery) return true;
      const q = inboxSearchQuery.toLowerCase();
      return (msg.name || '').toLowerCase().includes(q) ||
             (msg.email || '').toLowerCase().includes(q) ||
             (msg.subject || '').toLowerCase().includes(q) ||
             (msg.message || '').toLowerCase().includes(q);
    });

    // If selected is not in filteredMsgs, default to the first one in filteredMsgs if any
    let selectedMsg = filteredMsgs.find(m => m.id === selectedInquiryId);
    if (!selectedMsg && filteredMsgs.length > 0) {
      selectedInquiryId = filteredMsgs[0].id;
      selectedMsg = filteredMsgs[0];
    }

    if (filteredMsgs.length === 0) {
      // Show empty list but keep the search box
      if (inquiriesListFull) {
        inquiriesListFull.innerHTML = `
          <div style="display:grid; grid-template-columns: 300px 1fr; gap: 24px; min-height: 550px; background: rgba(17, 7, 2, 0.4); padding: 24px; border-radius: 16px; border: 1px solid rgba(251,243,227,0.05);">
            <!-- Left Column (Inbox) -->
            <div style="display:flex; flex-direction:column; border-right: 1px solid rgba(251,243,227,0.05); padding-right: 24px;">
              <h3 style="font-family: 'Montserrat', sans-serif; font-size: 14px; color: #FBF3E3; margin-bottom: 16px; font-weight: 600;">Recent Inbox</h3>
              <input type="text" id="inbox-search-input" placeholder="Search by name, email..." value="${inboxSearchQuery}" style="background: rgba(14,6,2,0.85); border: 1.5px solid rgba(224, 176, 80, 0.25); border-radius: 8px; padding: 8px 12px; font-family: 'Montserrat', sans-serif; font-size: 12px; color: #FFFFFF; width: 100%; outline: none; margin-bottom: 14px;">
              <p class="admin-empty-state" style="font-size: 12px; padding: 24px 0;">No matching inquiries found.</p>
            </div>
            <!-- Right Column -->
            <div style="display:flex; align-items:center; justify-content:center; color:rgba(251,243,227,0.25); font-style:italic;">
              Select an inquiry to view details
            </div>
          </div>
        `;
        const searchInput = document.getElementById('inbox-search-input');
        if (searchInput) {
          searchInput.focus();
          const len = searchInput.value.length;
          searchInput.setSelectionRange(len, len);
          searchInput.addEventListener('input', (e) => {
            inboxSearchQuery = e.target.value;
            renderInquiries(msgs);
          });
        }
      }
      return;
    }

    const svcSel = services.find(s => s.slug === selectedMsg.service);
    const isSelectedUnread = selectedMsg.status === 'pending' || !selectedMsg.status || selectedMsg.status === 'read';
    
    // Safety check for createdAt date
    let createdDateStr = 'Unknown Date';
    if (selectedMsg.createdAt) {
      const dateObj = selectedMsg.createdAt.toDate ? selectedMsg.createdAt.toDate() : new Date(selectedMsg.createdAt);
      createdDateStr = dateObj.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    }

    const listHTML = `
      <div style="display:grid; grid-template-columns: 300px 1fr; gap: 24px; min-height: 550px; background: rgba(17, 7, 2, 0.4); padding: 24px; border-radius: 16px; border: 1px solid rgba(251,243,227,0.05);">
        <!-- Left Column (Inbox) -->
        <div style="display:flex; flex-direction:column; border-right: 1px solid rgba(251,243,227,0.05); padding-right: 24px;">
          <h3 style="font-family: 'Montserrat', sans-serif; font-size: 14px; color: #FBF3E3; margin-bottom: 16px; font-weight: 600;">Recent Inbox</h3>
          <input type="text" id="inbox-search-input" placeholder="Search by name, email..." value="${inboxSearchQuery}" style="background: rgba(14,6,2,0.85); border: 1.5px solid rgba(224, 176, 80, 0.25); border-radius: 8px; padding: 8px 12px; font-family: 'Montserrat', sans-serif; font-size: 12px; color: #FFFFFF; width: 100%; outline: none; margin-bottom: 14px;">
          <div style="display:flex; flex-direction:column; gap: 8px; overflow-y:auto; max-height: 600px; padding-right: 8px;" class="admin-scrollbar">
            ${filteredMsgs.map(msg => {
              const isSelected = msg.id === selectedInquiryId;
              const isUnread = msg.status === 'pending' || !msg.status || msg.status === 'read';
              const timeAgo = getTimeAgo(msg.createdAt);
              const svc = services.find(s => s.slug === msg.service);
              
              return `
                <div class="inquiry-list-item" data-id="${msg.id}" style="padding: 16px; cursor: pointer; border-radius: 8px; border-left: 3px solid ${isSelected ? '#E0B050' : 'transparent'}; background: ${isSelected ? 'rgba(251,243,227,0.05)' : 'transparent'}; transition: all 0.2s ease;">
                  <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
                    <strong style="font-size: 13px; color: #FBF3E3;">${msg.name || 'Visitor'}</strong>
                    <span style="font-size: 11px; color: rgba(251,243,227,0.4);">${timeAgo}</span>
                  </div>
                  <div style="font-size: 11px; color: rgba(251,243,227,0.6); margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${msg.subject || 'General Inquiry'} ${svc ? `· ${svc.name}` : ''}
                  </div>
                  <div style="display:flex; justify-content:flex-end;">
                    ${isUnread ? '<span style="font-size: 9px; padding: 2px 6px; background: rgba(224,176,80,0.15); color: #E0B050; border-radius: 4px; text-transform: uppercase; font-weight: 600; letter-spacing: 1px;">Unread</span>' : '<span style="font-size: 9px; padding: 2px 6px; color: rgba(251,243,227,0.3); text-transform: uppercase; letter-spacing: 1px;">Read</span>'}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Right Column (Details) -->
        <div style="display:flex; flex-direction:column; padding-left: 8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid rgba(251,243,227,0.05);">
            <div>
              <h2 style="font-family: 'Playfair Display', serif; font-size: 20px; color: #FBF3E3; margin-bottom: 6px;">${selectedMsg.subject || 'General Inquiry'} ${svcSel ? `· ${svcSel.name}` : ''}</h2>
              <div style="font-size: 12px; color: rgba(251,243,227,0.5);">Received on ${createdDateStr}</div>
            </div>
            <div style="display:flex; gap: 8px;">
              ${isSelectedUnread ? `
                <button class="admin-action-sm admin-inquiry-accept-btn" data-id="${selectedMsg.id}" style="color:#110702; background:#7deca0; border:none; padding:8px 16px; font-weight:600; border-radius: 4px; cursor:pointer;">Accept</button>
                <button class="admin-action-sm admin-inquiry-reject-btn" data-id="${selectedMsg.id}" style="color:#ff6b6b; background:rgba(255,107,107,0.1); border:none; padding:8px 16px; font-weight:600; border-radius: 4px; cursor:pointer;">Reject</button>
              ` : `
                <span style="font-size: 12px; font-weight: 600; padding: 6px 12px; background: rgba(251,243,227,0.05); border-radius: 4px; color: ${selectedMsg.convertedToOrder ? '#7deca0' : (selectedMsg.status === 'accepted' ? '#7deca0' : (selectedMsg.status === 'rejected' ? '#ff6b6b' : 'rgba(251,243,227,0.5)'))};">
                  ${selectedMsg.status === 'delivered' ? '✓ Delivered' : (selectedMsg.convertedToOrder ? '🚚 Accepted & In Delivery' : (selectedMsg.status === 'accepted' ? '✓ Accepted' : (selectedMsg.status === 'rejected' ? '✗ Rejected' : 'Read')))}
                </span>
              `}
            </div>
          </div>

          <div style="background: rgba(26,12,3,0.4); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <h4 style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(251,243,227,0.4); margin-bottom: 16px;">Sender Contact Details</h4>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div>
                <div style="font-size: 10px; color: rgba(251,243,227,0.3); margin-bottom: 4px;">Name</div>
                <div style="font-size: 13px; color: #FBF3E3;">${selectedMsg.name || 'Visitor'}</div>
              </div>
              <div>
                <div style="font-size: 10px; color: rgba(251,243,227,0.3); margin-bottom: 4px;">Email</div>
                <div style="font-size: 13px; color: #E0B050;">${selectedMsg.email}</div>
              </div>
              <div>
                <div style="font-size: 10px; color: rgba(251,243,227,0.3); margin-bottom: 4px;">Phone</div>
                <div style="font-size: 13px; color: #FBF3E3;">${selectedMsg.phone || '—'}</div>
              </div>
              <div>
                <div style="font-size: 10px; color: rgba(251,243,227,0.3); margin-bottom: 4px;">Location / Territory</div>
                <div style="font-size: 13px; color: #FBF3E3;">${selectedMsg.location || '—'}</div>
              </div>
            </div>
          </div>

          <div style="flex: 1;">
            <h4 style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(251,243,227,0.4); margin-bottom: 12px;">Message Text</h4>
            <div style="background: rgba(251,243,227,0.03); border-left: 2px solid #E0B050; padding: 16px; border-radius: 0 8px 8px 0; font-size: 13.5px; line-height: 1.7; color: rgba(251,243,227,0.8); white-space: pre-wrap;">${selectedMsg.message}</div>
          </div>
          
          ${selectedMsg.status === 'accepted' ? `
            <div style="background: rgba(125,236,160,0.05); border: 1.5px dashed rgba(125,236,160,0.2); border-radius: 12px; padding: 20px; margin-top: 24px;">
              <h4 style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #7deca0; margin-bottom: 16px; display:flex; align-items:center; gap:8px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color: #7deca0;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Operational B2B Actions (Inquiry Accepted)
              </h4>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                ${selectedMsg.convertedToOrder ? `
                  <button class="admin-action-btn-elite" style="background: rgba(125,236,160,0.1); border: 1.5px solid rgba(125,236,160,0.3); color: #7deca0; padding: 12px; font-size: 12px; font-weight: 700; border-radius: 8px; cursor: default; display: flex; align-items: center; justify-content: center; gap: 8px; grid-column: span 2; box-shadow: 0 4px 12px rgba(125, 236, 160, 0.1);">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                    ✓ Converted to Active B2B Delivery Order
                  </button>
                ` : `
                  <button class="admin-action-btn-elite admin-inquiry-convert-btn" data-id="${selectedMsg.id}" style="background: linear-gradient(135deg, #E0B050, #C8922A); color: #1E0E05; border: none; padding: 12px; font-size: 12px; font-weight: 700; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(224, 176, 80, 0.25);">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                    Convert to Delivery Order
                  </button>
                `}
                <a href="https://wa.me/${(selectedMsg.phone || '').replace(/[^0-9]/g, '') || '919419014741'}" target="_blank" class="admin-action-btn-elite" style="background: rgba(37,211,102,0.1); border: 1.5px solid rgba(37,211,102,0.3); color: #25D366; padding: 12px; font-size: 12px; font-weight: 600; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.734-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.97C16.528 2.028 14.07 1.001 11.453 1c-5.44 0-9.866 4.372-9.87 9.802 0 1.714.47 3.393 1.359 4.872L2.088 21l5.56-1.48.001-.004z"/></svg>
                  WhatsApp Client
                </a>
                <a href="mailto:${selectedMsg.email}?subject=Response to Inquiry: ${encodeURIComponent(selectedMsg.subject || 'Al Gani Supply Proposal')}&body=Hello ${encodeURIComponent(selectedMsg.name || 'Client')},%0A%0AThank you for contacting Al Gani General Suppliers.%0A%0AWe are pleased to accept your inquiry regarding ${encodeURIComponent(svcSel ? svcSel.name : (selectedMsg.subject || 'our services'))}.%0A%0A" class="admin-action-btn-elite" style="background: rgba(224,176,80,0.1); border: 1.5px solid rgba(224,176,80,0.3); color: #E0B050; padding: 12px; font-size: 12px; font-weight: 600; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  Email Proposal
                </a>
                <button class="admin-action-btn-elite admin-inquiry-print-btn" style="background: rgba(251,243,227,0.05); border: 1.5px solid rgba(251,243,227,0.1); color: #FBF3E3; padding: 12px; font-size: 12px; font-weight: 600; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  Print Work Order
                </button>
              </div>
              ${selectedMsg.convertedToOrder ? `
                <div style="margin-top: 14px; background: rgba(125,236,160,0.08); border: 1px solid rgba(125,236,160,0.2); border-radius: 8px; padding: 12px 16px; display:flex; align-items:center; gap:10px;">
                  <span style="font-size: 16px; animation: bounceTruck 2s infinite;">🚚</span>
                  <span style="font-family:'Montserrat', sans-serif; font-size: 11px; font-weight: 600; color: #7deca0; letter-spacing: 0.5px; text-transform: uppercase;">This order is actively tracking in the Deliveries section!</span>
                </div>
                <style>
                  @keyframes bounceTruck {
                    0%, 100% { transform: translateX(0); }
                    50% { transform: translateX(4px); }
                  }
                </style>
              ` : ''}
            </div>
          ` : ''}

          <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(251,243,227,0.05); display: flex; justify-content: space-between; align-items: center;">
             ${(selectedMsg.status === 'pending' || !selectedMsg.status) ? `<button class="admin-action-sm admin-inquiry-read-btn" data-id="${selectedMsg.id}" style="color:#110702; background:#E0B050; border:none; padding:10px 24px; font-weight:600; border-radius: 30px; cursor:pointer;">Mark as Client Read</button>` : '<span></span>'}
             
             <button class="admin-action-sm admin-inquiry-delete-btn" data-id="${selectedMsg.id}" style="color:#ff6b6b; background:rgba(255,107,107,0.1); border:1px solid rgba(255,107,107,0.2); padding:10px 20px; font-weight:600; border-radius: 30px; cursor:pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s;" onmouseover="this.style.background='#ff6b6b'; this.style.color='#110702';" onmouseout="this.style.background='rgba(255,107,107,0.1)'; this.style.color='#ff6b6b';">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:2px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
               Delete Inquiry
             </button>
          </div>
        </div>
      </div>
    `;

    if (inquiriesListFull) inquiriesListFull.innerHTML = listHTML;

    // Attach listener to search input
    const searchInput = document.getElementById('inbox-search-input');
    if (searchInput) {
      searchInput.focus();
      const len = searchInput.value.length;
      searchInput.setSelectionRange(len, len);
      searchInput.addEventListener('input', (e) => {
        inboxSearchQuery = e.target.value;
        renderInquiries(msgs);
      });
    }

    // Attach click listeners to left panel items to select inquiry
    document.querySelectorAll('.inquiry-list-item').forEach(item => {
      item.addEventListener('click', () => {
        selectedInquiryId = item.dataset.id;
        renderInquiries(msgs);
      });
    });

    // Attach accept/reject/read handler triggers
    document.querySelectorAll('.admin-inquiry-accept-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await updateDoc(doc(db, 'inquiries', btn.dataset.id), { status: 'accepted' });
      });
    });
    document.querySelectorAll('.admin-inquiry-reject-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await updateDoc(doc(db, 'inquiries', btn.dataset.id), { status: 'rejected' });
      });
    });
    document.querySelectorAll('.admin-inquiry-read-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await updateDoc(doc(db, 'inquiries', btn.dataset.id), { status: 'read' });
      });
    });

    // Attach convert-to-order B2B triggers
    document.querySelectorAll('.admin-inquiry-convert-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const msg = msgs.find(m => m.id === id);
        if (!msg) return;
        
        try {
          const svc = services.find(s => s.slug === msg.service) || { slug: msg.service || 'interior-paneling', name: msg.productName || msg.service };
          
          await addDoc(collection(db, 'orders'), {
            clientName: msg.name || 'B2B Client',
            service: svc.slug,
            region: msg.location || 'Kashmir Valley',
            notes: `Auto-converted B2B Inquiry: "${msg.message.substring(0, 120)}..."`,
            status: 'new',
            inquiryId: msg.id,
            customerEmail: msg.email,
            productName: msg.productName || svc.name,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          
          // Persist the conversion state on the inquiry itself
          await updateDoc(doc(db, 'inquiries', id), { convertedToOrder: true });
          
          alert(`Success! Auto-converted inquiry to a B2B Delivery Fulfillment Order.\n\nYou are being redirected to the 'Deliveries' tab to manage tracking.`);
          
          // Switch to Deliveries panel
          const deliveriesTab = document.querySelector('.admin-nav-item[data-panel="deliveries"]');
          if (deliveriesTab) {
            deliveriesTab.click();
          }
        } catch (err) {
          console.error(err);
          alert('Fulfillment conversion error: ' + err.message);
        }
      });
    });

    // Attach print triggers
    document.querySelectorAll('.admin-inquiry-print-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.print();
      });
    });

    // Attach delete triggers — hard-deletes from DB, chart stats preserved server-side
    document.querySelectorAll('.admin-inquiry-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm("Delete this inquiry? It will be removed from your inbox.\n\nHistorical chart data is preserved automatically.")) {
          const id = btn.dataset.id;
          btn.disabled = true;
          btn.textContent = 'Deleting...';
          try {
            const res = await fetch(`/api/inquiries/${id}`, { method: 'DELETE' });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.error || `HTTP ${res.status}`);
            }
            // Remove from local array and re-render
            const idx = currentInquiries.findIndex(m => m.id === id);
            if (idx !== -1) currentInquiries.splice(idx, 1);
            const remaining = currentInquiries.filter(m => !m.isDeleted);
            selectedInquiryId = remaining.length > 0 ? remaining[0].id : null;
            renderInquiries(currentInquiries);
            updateDashboardStats();
          } catch (err) {
            console.error('Error deleting inquiry:', err);
            alert('Could not delete inquiry: ' + err.message);
            btn.disabled = false;
            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:2px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg> Delete Inquiry`;
          }
        }
      });
    });
  }

  // Redesign Dashboard inquiries table to show real data
  const dashInquiriesTable = document.getElementById('dashboard-inquiries-table');
  if (dashInquiriesTable) {
    if (msgs.length === 0) {
      dashInquiriesTable.innerHTML = `<p class="admin-empty-state">No inquiries received yet.</p>`;
    } else {
      const previewMsgs = msgs.slice(0, 5);
      dashInquiriesTable.innerHTML = `
        <table class="table-elite">
          <thead>
            <tr>
              <th>Client</th>
              <th>Subject</th>
              <th>Location</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${previewMsgs.map(msg => {
              const svc = services.find(s => s.slug === msg.service);
              const serviceLabel = svc ? svc.name : (msg.subject || 'General Inquiry');
              const region = msg.location || '\u2014';
              
              let statusPill = '';
              if (msg.status === 'accepted') statusPill = `<span class="pill-status pill-delivered">\u2713 Accepted</span>`;
              else if (msg.status === 'rejected') statusPill = `<span class="pill-status pill-pending">\u2717 Rejected</span>`;
              else statusPill = `<span class="pill-status pill-active">New</span>`;

              return `
                <tr>
                  <td><strong>${msg.name || 'Visitor'}</strong></td>
                  <td>${serviceLabel}</td>
                  <td>${region}</td>
                  <td>${statusPill}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }
  }
}

function updateDashboardStats() {
  // 1. Active Inquiries Count — exclude hard-deleted (isDeleted flag) records
  const visibleInquiries = currentInquiries.filter(i => !i.isDeleted);
  const inquiriesEl = document.getElementById('stat-active-inquiries');
  if (inquiriesEl) {
    inquiriesEl.textContent = visibleInquiries.length;
  }

  // 2. Quotes Sent Count (15 base + visible inquiries + approved/shipped orders)
  const quotesCount = 15 + visibleInquiries.length + currentOrders.filter(o => o.status !== 'new').length;
  const quotesEl = document.getElementById('stat-quotes-sent');
  if (quotesEl) {
    quotesEl.textContent = quotesCount;
  }

  // 3. Deliveries Count
  const deliveriesEl = document.getElementById('stat-active-orders');
  if (deliveriesEl) {
    deliveriesEl.textContent = currentOrders.length;
  }

  // 4. Partner Organizations Count (active database partners + unique clientNames from orders)
  const activePartnersCount = currentPartners.filter(p => p.status === 'active').length;
  const uniqueClients = new Set(currentOrders.map(o => o.clientName?.trim()).filter(Boolean));
  const partnersCount = (activePartnersCount || 4) + uniqueClients.size;
  const partnersEl = document.getElementById('stat-partner-organizations');
  if (partnersEl) {
    partnersEl.textContent = partnersCount;
  }

  // 5. Update unread badge on sidebar Inquiries nav item
  const unreadCount = visibleInquiries.filter(i => i.status === 'pending' || !i.status).length;
  const badge = document.getElementById('nav-inquiries-badge');
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // 6. Calculate and Render Donut Chart dynamically
  // Use ALL currentInquiries (including any remaining isDeleted ones) for chart continuity,
  // since hard-deleted ones are already removed from currentInquiries by the delete handler.
  const serviceCounts = {};
  currentInquiries.forEach(inq => {
    const slug = inq.service;
    if (!slug) return;
    const svc = services.find(s => s.slug === slug);
    const label = svc ? svc.name : 'General Inquiry';
    serviceCounts[label] = (serviceCounts[label] || 0) + 1;
  });

  const sortedServices = Object.entries(serviceCounts).sort((a,b) => b[1] - a[1]);
  const topServices = sortedServices.slice(0, 3);
  let othersCount = 0;
  sortedServices.slice(3).forEach(e => othersCount += e[1]);

  let chartData = [];
  if (topServices.length > 0) {
    topServices.forEach(e => chartData.push({ label: e[0], count: e[1] }));
    if (othersCount > 0) {
      chartData.push({ label: 'Others', count: othersCount });
    }
  }

  if (chartData.length === 0) {
    chartData = [
      { label: 'Beekeeping', count: 40 },
      { label: 'Paneling', count: 30 },
      { label: 'Dairy Plant', count: 15 },
      { label: 'IoT Sensors', count: 15 }
    ];
  }

  const total = chartData.reduce((acc, curr) => acc + curr.count, 0);
  const colors = ['#C85A2A', '#8A4A1C', '#DCA86A', '#E0B050'];

  let strokeDashOffset = 0;
  const segmentsHTML = chartData.map((item, idx) => {
    const percentage = Math.round((item.count / total) * 100);
    const color = colors[idx % colors.length];
    const segmentHTML = `
      <circle class="donut-segment" cx="21" cy="21" r="15.915" stroke="${color}" stroke-dasharray="${percentage} ${100 - percentage}" stroke-dashoffset="${strokeDashOffset}" filter="url(#donut-glow-filter)"></circle>
    `;
    strokeDashOffset -= percentage;
    return segmentHTML;
  }).join('');

  const legendHTML = chartData.map((item, idx) => {
    const percentage = Math.round((item.count / total) * 100);
    const color = colors[idx % colors.length];
    return `
      <div class="legend-item-elite">
        <span class="legend-dot-elite" style="background:${color};"></span>
        <span>${item.label.substring(0, 20)}${item.label.length > 20 ? '...' : ''} (${percentage}%)</span>
      </div>
    `;
  }).join('');

  const chartContainer = document.getElementById('donut-chart-container');
  if (chartContainer) {
    chartContainer.innerHTML = `
      <div class="admin-card-title-elite">Service Category Distribution</div>
      <div class="donut-wrap">
        <svg class="donut-svg" width="180" height="180" viewBox="0 0 42 42">
          <defs>
            <filter id="donut-glow-filter">
              <feGaussianBlur stdDeviation="1.5" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          ${segmentsHTML}
        </svg>
      </div>
      <div class="legend-grid-elite">
        ${legendHTML}
      </div>
    `;
  }
}

// ── LOAD PRODUCT CONFIGS FROM FIRESTORE ──
async function loadProductStatuses() {
  try {
    const snapshot = await getDocs(collection(db, 'products'));
    snapshot.forEach(d => {
      const data = d.data();
      const slug = d.id;
      
      const select = document.querySelector(`.admin-product-status-select[data-slug="${slug}"]`);
      if (select && data.stockStatus) select.value = data.stockStatus;
      
      const toggle = document.querySelector(`.admin-toggle-input[data-slug="${slug}"]`);
      if (toggle && data.visible !== undefined) toggle.checked = data.visible;
      
      const invCount = data.inventoryCount !== undefined ? data.inventoryCount : 100;
      const threshold = data.lowStockThreshold !== undefined ? data.lowStockThreshold : 10;
      
      const invRange = document.querySelector(`.admin-product-inventory-range[data-slug="${slug}"]`);
      const invNum = document.querySelector(`.admin-product-inventory-number[data-slug="${slug}"]`);
      const stockSpan = document.querySelector(`.stock-num-${slug}`);
      
      if (invRange) invRange.value = invCount;
      if (invNum) invNum.value = invCount;
      if (stockSpan) stockSpan.textContent = invCount;
      
      const threshInput = document.querySelector(`.admin-product-threshold-input[data-slug="${slug}"]`);
      if (threshInput) threshInput.value = threshold;
    });
  } catch (err) {
    console.error('Error loading product statuses:', err);
  }
}

// ── TIME CONVERSION HELPERS ──
function getTimeAgo(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ── REAL-TIME SOCKET AND LISTENER CLEANUP ──
export function cleanupAdmin() {
  if (unsubInquiries) { unsubInquiries(); unsubInquiries = null; }
  if (unsubOrders) { unsubOrders(); unsubOrders = null; }
  if (unsubAlerts) { unsubAlerts(); unsubAlerts = null; }
  if (unsubPartners) { unsubPartners(); unsubPartners = null; }
}
