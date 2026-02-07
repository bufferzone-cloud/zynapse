/* ==================== ZYNAPSE iOS THEMED CHAT APP - PRODUCTION CSS ==================== */
/* Reset & Base Styles - Compact iOS Style */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-tap-highlight-color: transparent;
}

:root {
    /* Color Palette - Pure White iOS Theme */
    --white: #ffffff;
    --white-98: #fafafa;
    --white-95: #f2f2f2;
    --gray-50: #f8f8f8;
    --gray-100: #f0f0f0;
    --gray-150: #e8e8e8;
    --gray-200: #e0e0e0;
    --gray-300: #d1d1d6;
    --gray-400: #c7c7cc;
    --gray-500: #8e8e93;
    --gray-600: #6d6d72;
    --gray-700: #48484a;
    --gray-800: #3a3a3c;
    --gray-900: #2c2c2e;
    --black: #000000;
    
    /* Message Colors */
    --blue: #007aff;
    --blue-light: rgba(0, 122, 255, 0.1);
    --blue-msg: #007aff;
    --blue-msg-light: #5ac8fa;
    --green: #34c759;
    --green-light: #4cd964;
    --red: #ff3b30;
    --red-light: #ff5757;
    --red-dark: #d70015;
    --red-msg: #ff3b30;
    --orange: #ff9500;
    --purple: #af52de;
    --yellow: #ffcc00;
    --zyne-red: #ff3b30;
    
    /* Shadows */
    --shadow-subtle: 0 1px 3px rgba(0, 0, 0, 0.05);
    --shadow-light: 0 2px 8px rgba(0, 0, 0, 0.04);
    --shadow-medium: 0 4px 12px rgba(0, 0, 0, 0.05);
    --shadow-heavy: 0 8px 24px rgba(0, 0, 0, 0.06);
    --shadow-float: 0 12px 32px rgba(0, 0, 0, 0.08);
    
    /* Border Radius */
    --radius-xs: 4px;
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-xl: 20px;
    --radius-2xl: 24px;
    --radius-circle: 50%;
    
    /* Typography - Compact */
    --font-sf: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
    --font-mono: 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace;
    
    /* Spacing - Compact */
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-5: 20px;
    --space-6: 24px;
    --space-8: 32px;
    --space-10: 40px;
    
    /* Transitions */
    --transition-fast: 150ms ease;
    --transition-normal: 250ms ease;
    --transition-slow: 350ms ease;
    --transition-spring: 400ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* Base Styles */
html {
    font-size: 15px;
    height: 100%;
    overflow: hidden;
}

body {
    font-family: var(--font-sf);
    background: var(--white);
    color: var(--gray-900);
    line-height: 1.35;
    height: 100%;
    position: fixed;
    width: 100%;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
}

/* Safe Area Insets for Notch Devices */
.safe-area-top {
    padding-top: env(safe-area-inset-top);
    padding-top: constant(safe-area-inset-top);
}

.safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom);
    padding-bottom: constant(safe-area-inset-bottom);
}

/* Layout Containers */
.app-container {
    height: 100vh;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    background: var(--white);
    position: relative;
    overflow: hidden;
}

.page-container {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

/* ==================== LOADING & AUTH STYLES ==================== */
.loading-screen {
    position: fixed;
    inset: 0;
    background: var(--white);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 99999;
    opacity: 1;
    transition: opacity var(--transition-slow);
}

.loading-screen.hidden {
    opacity: 0;
    pointer-events: none;
}

.loading-content {
    text-align: center;
    padding: var(--space-6);
}

.loading-logo {
    width: 72px;
    height: 72px;
    margin-bottom: var(--space-6);
    border-radius: var(--radius-lg);
    object-fit: contain;
    animation: gentlePulse 2s infinite;
}

.spinner-large {
    width: 36px;
    height: 36px;
    border: 3px solid rgba(0, 122, 255, 0.08);
    border-top-color: var(--blue);
    border-radius: var(--radius-circle);
    margin: 0 auto var(--space-4);
    animation: spin 0.8s linear infinite;
}

.loading-content p {
    color: var(--gray-600);
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.3px;
}

/* Authentication Pages */
.auth-page {
    height: 100vh;
    height: 100dvh;
    background: var(--white);
    display: flex;
    flex-direction: column;
    position: relative;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
}

.auth-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-6);
    max-width: 400px;
    margin: 0 auto;
    width: 100%;
}

.welcome-screen {
    text-align: center;
    width: 100%;
    animation: fadeInUp 0.5s var(--transition-spring);
}

.logo-large {
    width: 88px;
    height: 88px;
    margin: 0 auto var(--space-4);
    border-radius: var(--radius-lg);
    object-fit: contain;
    transition: transform var(--transition-normal);
}

.welcome-screen h1 {
    font-size: 32px;
    font-weight: 800;
    color: var(--black);
    margin-bottom: var(--space-2);
    letter-spacing: -0.5px;
}

.tagline {
    font-size: 15px;
    color: var(--gray-600);
    margin-bottom: var(--space-2);
    line-height: 1.4;
    padding: 0 var(--space-4);
}

.powered-by {
    font-size: 12px;
    color: var(--gray-500);
    margin-bottom: var(--space-8);
    font-weight: 500;
    letter-spacing: 0.5px;
}

.welcome-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin-bottom: var(--space-6);
    width: 100%;
}

.welcome-footer {
    padding-top: var(--space-4);
    border-top: 1px solid var(--gray-150);
    font-size: 12px;
    color: var(--gray-500);
}

.welcome-footer .link {
    color: var(--blue);
    text-decoration: none;
    font-weight: 600;
}

/* Auth Forms */
.auth-form {
    background: var(--white);
    border-radius: var(--radius-xl);
    padding: var(--space-6);
    width: 100%;
    animation: fadeInUp 0.4s var(--transition-spring);
}

.auth-header {
    text-align: center;
    margin-bottom: var(--space-6);
    position: relative;
}

.back-btn {
    position: absolute;
    left: 0;
    top: 0;
    background: none;
    border: none;
    color: var(--gray-500);
    font-size: 18px;
    cursor: pointer;
    padding: var(--space-2);
    border-radius: var(--radius-circle);
    transition: all var(--transition-normal);
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.logo-small {
    width: 52px;
    height: 52px;
    border-radius: var(--radius-md);
    margin-bottom: var(--space-4);
    object-fit: contain;
}

.auth-header h2 {
    font-size: 22px;
    font-weight: 700;
    color: var(--black);
    margin-bottom: var(--space-1);
}

.auth-header p {
    font-size: 14px;
    color: var(--gray-600);
}

.auth-form-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
}

.input-group {
    position: relative;
}

.input-group i {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--gray-500);
    font-size: 16px;
    z-index: 1;
    pointer-events: none;
}

.input-group input {
    width: 100%;
    padding: 14px 14px 14px 40px;
    font-size: 15px;
    border: 1.5px solid var(--gray-200);
    border-radius: var(--radius-md);
    background: var(--white);
    color: var(--black);
    transition: all var(--transition-normal);
    font-family: var(--font-sf);
    -webkit-appearance: none;
    appearance: none;
}

.input-group input:focus {
    outline: none;
    border-color: var(--blue);
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.08);
}

.input-group input::placeholder {
    color: var(--gray-400);
    font-weight: 400;
}

.toggle-password {
    left: auto !important;
    right: 14px;
    cursor: pointer;
    pointer-events: auto;
}

/* Profile Upload - Compact */
.profile-upload-section {
    margin: var(--space-4) 0;
}

.upload-label {
    display: block;
    margin-bottom: var(--space-3);
    font-size: 14px;
    font-weight: 600;
    color: var(--gray-800);
}

.profile-upload-container {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    margin-bottom: var(--space-3);
}

.upload-preview {
    width: 72px;
    height: 72px;
    border-radius: var(--radius-circle);
    background: var(--gray-50);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1.5px dashed var(--gray-300);
    transition: all var(--transition-normal);
    flex-shrink: 0;
}

.upload-preview:hover {
    border-color: var(--blue);
}

.preview-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: var(--space-2);
}

.preview-placeholder i {
    font-size: 22px;
    color: var(--gray-400);
    margin-bottom: 4px;
}

.preview-placeholder span {
    font-size: 11px;
    color: var(--gray-500);
}

.upload-buttons {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
}

.btn-upload, .btn-remove {
    padding: 10px 14px;
    border-radius: var(--radius-md);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-normal);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1.5px solid;
}

.btn-upload {
    background: var(--white);
    color: var(--blue);
    border-color: var(--blue);
}

.btn-upload:hover:not(:disabled) {
    background: var(--blue);
    color: var(--white);
}

.btn-remove {
    background: var(--white);
    color: var(--red);
    border-color: var(--red);
}

.btn-remove:hover:not(:disabled) {
    background: var(--red);
    color: var(--white);
}

.upload-hint {
    font-size: 11px;
    color: var(--gray-500);
    margin-top: 2px;
}

/* Terms */
.terms-agreement {
    margin: var(--space-3) 0;
    font-size: 12px;
    color: var(--gray-600);
}

/* Divider */
.auth-divider {
    display: flex;
    align-items: center;
    margin: var(--space-4) 0;
    color: var(--gray-400);
    font-size: 12px;
}

.auth-divider::before,
.auth-divider::after {
    content: "";
    flex: 1;
    height: 1px;
    background: var(--gray-200);
}

.auth-divider span {
    padding: 0 var(--space-3);
}

/* Buttons */
.btn-primary, .btn-secondary, .btn-danger {
    padding: 14px;
    border-radius: var(--radius-md);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-normal);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: none;
    width: 100%;
}

.btn-primary {
    background: var(--blue);
    color: var(--white);
}

.btn-primary:hover:not(:disabled) {
    background: #0066d6;
    transform: translateY(-1px);
    box-shadow: var(--shadow-light);
}

.btn-secondary {
    background: var(--white);
    color: var(--blue);
    border: 1.5px solid var(--blue);
}

.btn-secondary:hover:not(:disabled) {
    background: var(--blue);
    color: var(--white);
}

.btn-danger {
    background: var(--red);
    color: var(--white);
}

.btn-danger:hover:not(:disabled) {
    background: var(--red-dark);
}

.btn-google {
    background: var(--white);
    color: var(--gray-800);
    border: 1.5px solid var(--gray-200);
    padding: 12px;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-normal);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
}

.btn-google:hover {
    background: var(--gray-50);
    border-color: var(--gray-300);
}

/* Auth Switch */
.auth-switch {
    text-align: center;
    margin-top: var(--space-4);
    padding-top: var(--space-4);
    border-top: 1px solid var(--gray-150);
    font-size: 14px;
    color: var(--gray-600);
}

.auth-switch .link {
    color: var(--blue);
    font-weight: 600;
    text-decoration: none;
}

/* ==================== APP HOME PAGE STYLES ==================== */
.app-home {
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
    background: var(--white);
    position: relative;
}

/* Header */
.app-header {
    background: var(--white);
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--gray-150);
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    background: rgba(255, 255, 255, 0.92);
}

.header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    flex: 1;
}

.header-logo {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    object-fit: contain;
    flex-shrink: 0;
}

.user-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
}

.user-info h2 {
    font-size: 16px;
    font-weight: 700;
    color: var(--black);
    margin-bottom: 2px;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.user-id-container {
    display: flex;
    align-items: center;
    gap: 6px;
}

.user-id {
    font-size: 12px;
    color: var(--gray-600);
    font-family: var(--font-mono);
    letter-spacing: 0.3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.copy-btn {
    background: none;
    border: none;
    color: var(--gray-500);
    cursor: pointer;
    padding: 4px;
    border-radius: var(--radius-xs);
    transition: all var(--transition-normal);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    flex-shrink: 0;
}

.copy-btn:hover {
    color: var(--blue);
    background: var(--gray-100);
}

/* Profile Button */
.profile-btn {
    background: none;
    border: none;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    padding: 6px 8px;
    border-radius: var(--radius-md);
    transition: background var(--transition-normal);
    flex-shrink: 0;
}

.profile-pic-small {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-circle);
    object-fit: cover;
    border: 1.5px solid var(--gray-200);
}

/* Navigation */
.app-nav {
    display: flex;
    justify-content: space-around;
    padding: 8px 12px;
    background: var(--white);
    border-bottom: 1px solid var(--gray-150);
    position: sticky;
    top: 56px;
    z-index: 99;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    background: rgba(255, 255, 255, 0.92);
}

.nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    text-decoration: none;
    color: var(--gray-500);
    padding: 8px 12px;
    border-radius: var(--radius-md);
    transition: all var(--transition-normal);
    position: relative;
    flex: 1;
    max-width: 80px;
}

.nav-item i {
    font-size: 18px;
    transition: color var(--transition-normal);
}

.nav-item span {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.3px;
    transition: color var(--transition-normal);
}

.nav-item.active {
    color: var(--blue);
}

.nav-item.active i {
    color: var(--blue);
}

.nav-item.active span {
    color: var(--blue);
}

.nav-item.active::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 3px;
    height: 3px;
    background: var(--blue);
    border-radius: var(--radius-circle);
}

.nav-item:hover:not(.active) {
    color: var(--gray-700);
    background: var(--gray-50);
}

/* Badge */
.badge {
    position: absolute;
    top: -2px;
    right: -2px;
    background: var(--red);
    color: var(--white);
    font-size: 9px;
    font-weight: 700;
    min-width: 16px;
    height: 16px;
    border-radius: var(--radius-circle);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    border: 1.5px solid var(--white);
}

/* Main Content */
.app-main {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--white);
    position: relative;
    -webkit-overflow-scrolling: touch;
}

.page {
    display: none;
    height: 100%;
    flex-direction: column;
}

.page.active {
    display: flex;
}

/* Home Page - Empty Chat List */
.home-page {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.chats-header {
    padding: 12px 16px;
    background: var(--white);
    border-bottom: 1px solid var(--gray-150);
    position: sticky;
    top: 0;
    z-index: 10;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    background: rgba(255, 255, 255, 0.92);
}

.chats-header h2 {
    font-size: 18px;
    font-weight: 700;
    color: var(--black);
}

.chats-list {
    flex: 1;
    overflow-y: auto;
    padding: 0;
}

.chat-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--gray-100);
    background: var(--white);
    cursor: pointer;
    transition: background var(--transition-fast);
    position: relative;
}

.chat-item:hover {
    background: var(--gray-50);
}

.chat-item.active {
    background: var(--blue-light);
}

.chat-avatar {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-circle);
    object-fit: cover;
    margin-right: 12px;
    flex-shrink: 0;
}

.chat-info {
    flex: 1;
    min-width: 0;
}

.chat-info h3 {
    font-size: 15px;
    font-weight: 600;
    color: var(--black);
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.chat-preview {
    font-size: 13px;
    color: var(--gray-600);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
}

.chat-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    margin-left: 8px;
    flex-shrink: 0;
}

.chat-time {
    font-size: 11px;
    color: var(--gray-500);
    white-space: nowrap;
}

.unread-badge {
    background: var(--blue);
    color: var(--white);
    font-size: 11px;
    font-weight: 700;
    width: 20px;
    height: 20px;
    border-radius: var(--radius-circle);
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Empty State */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
    color: var(--gray-500);
    height: 100%;
}

.empty-state i {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.3;
}

.empty-state h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--gray-700);
    margin-bottom: 8px;
}

.empty-state p {
    font-size: 14px;
    color: var(--gray-600);
    max-width: 280px;
    line-height: 1.4;
}

/* Floating Button */
.floating-btn {
    position: fixed;
    bottom: 20px;
    right: 16px;
    background: var(--blue);
    color: var(--white);
    border: none;
    width: 52px;
    height: 52px;
    border-radius: var(--radius-circle);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-float);
    transition: all var(--transition-spring);
    z-index: 1000;
    touch-action: manipulation;
}

.floating-btn i {
    font-size: 18px;
}

.floating-btn span {
    font-size: 9px;
    font-weight: 700;
    margin-top: 2px;
    letter-spacing: 0.5px;
}

.floating-btn:hover {
    transform: scale(1.08);
    box-shadow: var(--shadow-heavy);
}

.floating-btn:active {
    transform: scale(0.96);
}

/* ==================== MODALS & POPUPS ==================== */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 2000;
    padding: 16px;
    animation: fadeIn 0.3s ease;
}

.modal-overlay.active {
    display: flex;
}

.modal-content {
    background: var(--white);
    border-radius: var(--radius-xl);
    width: 100%;
    max-width: 400px;
    max-height: 85vh;
    overflow: hidden;
    animation: modalSlideUp 0.4s var(--transition-spring);
    box-shadow: var(--shadow-float);
    position: relative;
    margin: auto;
}

.modal-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--gray-150);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--white);
    position: sticky;
    top: 0;
    z-index: 1;
}

.modal-header h3 {
    font-size: 17px;
    font-weight: 700;
    color: var(--black);
}

.close-modal {
    background: none;
    border: none;
    color: var(--gray-500);
    font-size: 20px;
    cursor: pointer;
    padding: 4px;
    border-radius: var(--radius-circle);
    transition: all var(--transition-normal);
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.close-modal:hover {
    background: var(--gray-100);
    color: var(--black);
}

.modal-body {
    padding: 20px;
    max-height: calc(85vh - 60px);
    overflow-y: auto;
}

/* Search User Modal */
.search-input-group {
    margin-bottom: 16px;
}

.search-input-group input {
    width: 100%;
    padding: 12px 16px;
    font-size: 15px;
    border: 1.5px solid var(--gray-200);
    border-radius: var(--radius-md);
    background: var(--white);
    color: var(--black);
    font-family: var(--font-sf);
}

.search-result {
    margin-top: 16px;
    animation: fadeIn 0.3s ease;
}

.user-found {
    background: var(--gray-50);
    border-radius: var(--radius-md);
    padding: 16px;
    border: 1.5px solid var(--gray-200);
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
}

.user-found-avatar {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-circle);
    object-fit: cover;
    flex-shrink: 0;
}

.user-found-info {
    flex: 1;
    min-width: 0;
}

.user-found-info h4 {
    font-size: 15px;
    font-weight: 600;
    color: var(--black);
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.user-found-info p {
    font-size: 13px;
    color: var(--gray-600);
}

.modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
}

.action-btn {
    flex: 1;
    padding: 12px;
    border-radius: var(--radius-md);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-normal);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
}

/* ==================== CHAT PAGE STYLES ==================== */
.chat-page {
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
    background: var(--white);
}

/* Chat Header */
.chat-header {
    background: var(--white);
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid var(--gray-150);
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    background: rgba(255, 255, 255, 0.92);
    flex-shrink: 0;
}

.back-btn {
    background: none;
    border: none;
    color: var(--blue);
    font-size: 18px;
    cursor: pointer;
    padding: 6px;
    border-radius: var(--radius-circle);
    transition: background var(--transition-normal);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
}

.chat-user-info {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
}

.chat-user-avatar {
    width: 38px;
    height: 38px;
    border-radius: var(--radius-circle);
    object-fit: cover;
    flex-shrink: 0;
}

.chat-user-details {
    flex: 1;
    min-width: 0;
}

.chat-user-details h3 {
    font-size: 16px;
    font-weight: 700;
    color: var(--black);
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.chat-status {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--gray-600);
    font-weight: 500;
}

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-circle);
    background: var(--gray-400);
}

.status-dot.online {
    background: var(--green);
}

.chat-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
}

.icon-btn {
    background: none;
    border: none;
    color: var(--gray-600);
    font-size: 18px;
    cursor: pointer;
    padding: 6px;
    border-radius: var(--radius-circle);
    transition: all var(--transition-normal);
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.icon-btn:hover {
    background: var(--gray-100);
    color: var(--black);
}

/* Chat Messages Area */
.chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    background: var(--white);
    display: flex;
    flex-direction: column;
    gap: 12px;
    position: relative;
    -webkit-overflow-scrolling: touch;
}

/* Custom Scrollbar */
.chat-messages::-webkit-scrollbar {
    width: 4px;
}

.chat-messages::-webkit-scrollbar-track {
    background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
    background: var(--gray-300);
    border-radius: 2px;
}

/* Message Date */
.message-date {
    text-align: center;
    margin: 12px 0;
    position: relative;
}

.date-label {
    display: inline-block;
    background: var(--gray-100);
    color: var(--gray-700);
    font-size: 12px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: var(--radius-lg);
    letter-spacing: 0.3px;
}

/* Message Bubbles - Apple Messages Style */
.message {
    display: flex;
    margin-bottom: 2px;
    animation: messageSlide 0.25s var(--transition-spring);
    max-width: 85%;
    align-self: flex-start;
}

.message.sent {
    align-self: flex-end;
    flex-direction: row-reverse;
}

.message-bubble {
    position: relative;
    padding: 10px 14px;
    border-radius: var(--radius-lg);
    word-wrap: break-word;
    line-height: 1.3;
    font-size: 15px;
    box-shadow: var(--shadow-subtle);
    max-width: 100%;
}

.message.received .message-bubble {
    background: var(--gray-100);
    color: var(--black);
    border-bottom-left-radius: var(--radius-xs);
    border-top-left-radius: var(--radius-lg);
    border-top-right-radius: var(--radius-lg);
    border-bottom-right-radius: var(--radius-lg);
}

.message.sent .message-bubble {
    background: var(--blue);
    color: var(--white);
    border-bottom-right-radius: var(--radius-xs);
    border-top-left-radius: var(--radius-lg);
    border-top-right-radius: var(--radius-lg);
    border-bottom-left-radius: var(--radius-lg);
}

.message-text {
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: pre-wrap;
}

.message-time {
    display: block;
    text-align: right;
    font-size: 10px;
    opacity: 0.7;
    margin-top: 4px;
    margin-left: 8px;
    float: right;
    clear: both;
    letter-spacing: 0.2px;
}

.message.sent .message-time {
    color: rgba(255, 255, 255, 0.8);
}

.message.received .message-time {
    color: var(--gray-600);
}

/* Media Messages */
.media-message .message-bubble {
    padding: 10px;
    max-width: 240px;
}

.chat-media {
    width: 100%;
    border-radius: var(--radius-md);
    margin-bottom: 8px;
    cursor: pointer;
    transition: transform var(--transition-normal);
    display: block;
}

.chat-media:hover {
    transform: scale(1.02);
}

.media-info {
    font-size: 12px;
    color: var(--gray-600);
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
}

/* Typing Indicator */
.typing-indicator {
    display: none;
    align-items: center;
    margin-bottom: 8px;
    padding-left: 16px;
    animation: fadeIn 0.3s ease;
}

.typing-bubble {
    background: var(--gray-100);
    border-radius: var(--radius-lg);
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 6px;
}

.typing-dots {
    display: flex;
    gap: 3px;
}

.typing-dot {
    width: 6px;
    height: 6px;
    background: var(--gray-500);
    border-radius: var(--radius-circle);
    animation: typing 1.4s infinite;
}

.typing-dot:nth-child(2) {
    animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
    animation-delay: 0.4s;
}

.typing-text {
    font-size: 12px;
    color: var(--gray-600);
    font-weight: 500;
}

/* Message Input Area */
.message-input-area {
    background: var(--white);
    padding: 12px 16px;
    border-top: 1px solid var(--gray-150);
    display: flex;
    align-items: flex-end;
    gap: 10px;
    position: sticky;
    bottom: 0;
    z-index: 100;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    background: rgba(255, 255, 255, 0.92);
    flex-shrink: 0;
}

.message-input-container {
    flex: 1;
    background: var(--gray-50);
    border-radius: 20px;
    padding: 0 14px;
    display: flex;
    align-items: center;
    transition: all var(--transition-normal);
    border: 1.5px solid transparent;
    min-height: 40px;
}

.message-input-container:focus-within {
    background: var(--white);
    border-color: var(--blue-light);
}

.message-input {
    flex: 1;
    background: none;
    border: none;
    padding: 10px 0;
    font-size: 15px;
    color: var(--black);
    font-family: var(--font-sf);
    resize: none;
    max-height: 100px;
    line-height: 1.3;
}

.message-input:focus {
    outline: none;
}

.message-input::placeholder {
    color: var(--gray-500);
}

.attach-btn {
    background: none;
    border: none;
    color: var(--gray-600);
    font-size: 20px;
    cursor: pointer;
    padding: 8px;
    border-radius: var(--radius-circle);
    transition: all var(--transition-normal);
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.attach-btn:hover {
    background: var(--gray-100);
    color: var(--blue);
}

.send-btn {
    background: var(--blue);
    color: var(--white);
    border: none;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-circle);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-normal);
    flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
    background: #0066d6;
    transform: scale(1.05);
}

.send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Attachment Options */
.attachment-options {
    position: absolute;
    bottom: 70px;
    left: 16px;
    background: var(--white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-heavy);
    padding: 12px;
    display: none;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    z-index: 1000;
    border: 1px solid var(--gray-200);
    animation: slideUp 0.3s var(--transition-spring);
    min-width: 200px;
}

.attachment-options.show {
    display: grid;
}

.attachment-btn {
    background: none;
    border: none;
    padding: 10px 6px;
    border-radius: var(--radius-md);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: all var(--transition-normal);
    color: var(--black);
    font-size: 12px;
    min-width: 64px;
}

.attachment-btn:hover {
    background: var(--gray-50);
    color: var(--blue);
}

.attachment-btn i {
    font-size: 18px;
    color: var(--gray-700);
}

.attachment-btn:hover i {
    color: var(--blue);
}

/* ==================== ZYNES PAGE STYLES ==================== */
.zynes-page {
    padding: 0;
}

.zynes-header {
    padding: 12px 16px;
    background: var(--white);
    border-bottom: 1px solid var(--gray-150);
    position: sticky;
    top: 0;
    z-index: 10;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    background: rgba(255, 255, 255, 0.92);
}

.zynes-header h2 {
    font-size: 18px;
    font-weight: 700;
    color: var(--black);
}

.create-zyne {
    padding: 16px;
    border-bottom: 1px solid var(--gray-150);
    background: var(--white);
}

.create-input {
    width: 100%;
    padding: 12px 16px;
    border: 1.5px solid var(--gray-200);
    border-radius: var(--radius-lg);
    font-size: 15px;
    font-family: var(--font-sf);
    resize: none;
    min-height: 60px;
    margin-bottom: 12px;
    background: var(--white);
}

.create-input:focus {
    outline: none;
    border-color: var(--blue);
}

.create-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.media-preview {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 12px;
}

.preview-item {
    width: 60px;
    height: 60px;
    border-radius: var(--radius-md);
    overflow: hidden;
    position: relative;
}

.preview-item img,
.preview-item video {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.remove-preview {
    position: absolute;
    top: 2px;
    right: 2px;
    background: rgba(0, 0, 0, 0.7);
    color: var(--white);
    border: none;
    width: 20px;
    height: 20px;
    border-radius: var(--radius-circle);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
}

.zynes-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

.zyne-card {
    background: var(--white);
    border-radius: var(--radius-lg);
    border: 1px solid var(--gray-150);
    margin-bottom: 16px;
    overflow: hidden;
    animation: fadeIn 0.3s ease;
}

.zyne-header {
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid var(--gray-100);
    cursor: pointer;
}

.zyne-avatar {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-circle);
    object-fit: cover;
    border: 2px solid var(--zyne-red);
}

.zyne-user-info {
    flex: 1;
}

.zyne-user-info h4 {
    font-size: 14px;
    font-weight: 600;
    color: var(--black);
    margin-bottom: 2px;
}

.zyne-time {
    font-size: 11px;
    color: var(--gray-500);
}

.zyne-content {
    padding: 16px;
}

.zyne-text {
    font-size: 15px;
    color: var(--black);
    line-height: 1.4;
    margin-bottom: 12px;
    white-space: pre-wrap;
}

.zyne-media {
    width: 100%;
    border-radius: var(--radius-md);
    margin-bottom: 12px;
    max-height: 300px;
    object-fit: contain;
    cursor: pointer;
}

.zyne-actions {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 0 16px 12px;
}

.zyne-action-btn {
    background: none;
    border: none;
    color: var(--gray-600);
    font-size: 14px;
    cursor: pointer;
    padding: 6px 0;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: color var(--transition-normal);
}

.zyne-action-btn:hover {
    color: var(--blue);
}

.zyne-action-btn.liked {
    color: var(--red);
}

.zyne-stats {
    font-size: 12px;
    color: var(--gray-500);
    padding: 0 16px 12px;
    display: flex;
    gap: 12px;
}

.zyne-comments {
    border-top: 1px solid var(--gray-100);
    padding: 12px 16px;
    background: var(--gray-50);
}

.comment-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-lg);
    font-size: 14px;
    margin-bottom: 8px;
    background: var(--white);
}

.comment-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 200px;
    overflow-y: auto;
}

.comment-item {
    display: flex;
    gap: 8px;
}

.comment-avatar {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-circle);
    object-fit: cover;
    flex-shrink: 0;
}

.comment-content {
    flex: 1;
}

.comment-text {
    font-size: 13px;
    color: var(--black);
    line-height: 1.3;
    background: var(--white);
    padding: 8px 12px;
    border-radius: var(--radius-md);
    border: 1px solid var(--gray-150);
}

.comment-info {
    font-size: 11px;
    color: var(--gray-500);
    margin-top: 2px;
    display: flex;
    justify-content: space-between;
}

/* Zyne Detail Modal */
.zyne-detail-modal .modal-content {
    max-width: 500px;
    max-height: 85vh;
}

.zyne-detail-content {
    padding: 0;
}

.zyne-detail-header {
    padding: 16px;
    border-bottom: 1px solid var(--gray-150);
    display: flex;
    align-items: center;
    gap: 12px;
}

.zyne-detail-avatar {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-circle);
    object-fit: cover;
    border: 2px solid var(--zyne-red);
}

.zyne-detail-info h4 {
    font-size: 15px;
    font-weight: 600;
    color: var(--black);
    margin-bottom: 2px;
}

.zyne-detail-time {
    font-size: 12px;
    color: var(--gray-500);
}

.zyne-detail-body {
    padding: 16px;
}

.zyne-detail-text {
    font-size: 16px;
    color: var(--black);
    line-height: 1.4;
    margin-bottom: 16px;
    white-space: pre-wrap;
}

.zyne-detail-media {
    width: 100%;
    border-radius: var(--radius-md);
    margin-bottom: 16px;
    max-height: 400px;
    object-fit: contain;
}

.zyne-detail-stats {
    padding: 12px 16px;
    border-top: 1px solid var(--gray-150);
    border-bottom: 1px solid var(--gray-150);
    background: var(--gray-50);
}

.zyne-detail-actions {
    padding: 16px;
    display: flex;
    gap: 12px;
}

.zyne-detail-action-btn {
    flex: 1;
    padding: 12px;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: none;
    transition: all var(--transition-normal);
}

.zyne-detail-action-btn.like {
    background: var(--white);
    color: var(--gray-700);
    border: 1.5px solid var(--gray-200);
}

.zyne-detail-action-btn.like.active {
    background: var(--red);
    color: var(--white);
    border-color: var(--red);
}

.zyne-detail-action-btn.comment {
    background: var(--blue);
    color: var(--white);
}

.zyne-detail-comments {
    padding: 16px;
    max-height: 300px;
    overflow-y: auto;
}

.zyne-detail-comment-input {
    padding: 16px;
    border-top: 1px solid var(--gray-150);
    display: flex;
    gap: 12px;
    align-items: center;
}

.zyne-detail-comment-input input {
    flex: 1;
    padding: 10px 14px;
    border: 1.5px solid var(--gray-200);
    border-radius: var(--radius-md);
    font-size: 14px;
}

/* ==================== GROUPS PAGE STYLES ==================== */
.groups-page {
    padding: 0;
}

.groups-header {
    padding: 12px 16px;
    background: var(--white);
    border-bottom: 1px solid var(--gray-150);
    position: sticky;
    top: 0;
    z-index: 10;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    background: rgba(255, 255, 255, 0.92);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.groups-header h2 {
    font-size: 18px;
    font-weight: 700;
    color: var(--black);
}

.create-group-btn {
    background: var(--blue);
    color: var(--white);
    border: none;
    padding: 8px 16px;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
}

.groups-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

.group-card {
    background: var(--white);
    border-radius: var(--radius-lg);
    padding: 16px;
    border: 1px solid var(--gray-150);
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    transition: all var(--transition-normal);
}

.group-card:hover {
    border-color: var(--blue);
    box-shadow: var(--shadow-light);
    transform: translateY(-1px);
}

.group-avatar {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-circle);
    object-fit: cover;
    flex-shrink: 0;
}

.group-info {
    flex: 1;
    min-width: 0;
}

.group-info h3 {
    font-size: 15px;
    font-weight: 600;
    color: var(--black);
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.group-info p {
    font-size: 13px;
    color: var(--gray-600);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.group-members {
    font-size: 11px;
    color: var(--gray-500);
    margin-top: 2px;
    display: flex;
    align-items: center;
    gap: 4px;
}

/* Create Group Modal */
.create-group-modal .modal-content {
    max-width: 450px;
}

.member-search-input {
    margin-bottom: 16px;
}

.members-list {
    max-height: 300px;
    overflow-y: auto;
    margin-bottom: 20px;
}

.member-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    border-bottom: 1px solid var(--gray-100);
}

.member-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.member-avatar {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-circle);
    object-fit: cover;
}

.member-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--black);
}

.member-checkbox {
    width: 20px;
    height: 20px;
    border-radius: var(--radius-sm);
    border: 2px solid var(--gray-300);
    cursor: pointer;
}

.member-checkbox.checked {
    background: var(--blue);
    border-color: var(--blue);
    position: relative;
}

.member-checkbox.checked::after {
    content: '✓';
    position: absolute;
    color: white;
    font-size: 12px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}

/* ==================== CONTACTS PAGE STYLES ==================== */
.contacts-page {
    padding: 0;
}

.contacts-header {
    padding: 12px 16px;
    background: var(--white);
    border-bottom: 1px solid var(--gray-150);
    position: sticky;
    top: 0;
    z-index: 10;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    background: rgba(255, 255, 255, 0.92);
}

.contacts-header h2 {
    font-size: 18px;
    font-weight: 700;
    color: var(--black);
}

.contacts-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

.contact-card {
    background: var(--white);
    border-radius: var(--radius-lg);
    padding: 12px 16px;
    border: 1px solid var(--gray-150);
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    transition: all var(--transition-normal);
}

.contact-card:hover {
    border-color: var(--blue);
    box-shadow: var(--shadow-light);
}

.contact-avatar {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-circle);
    object-fit: cover;
    flex-shrink: 0;
    position: relative;
}

.contact-info {
    flex: 1;
    min-width: 0;
}

.contact-info h3 {
    font-size: 15px;
    font-weight: 600;
    color: var(--black);
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.contact-status {
    font-size: 12px;
    color: var(--gray-600);
    display: flex;
    align-items: center;
    gap: 4px;
}

.status-dot {
    width: 6px;
    height: 6px;
    border-radius: var(--radius-circle);
}

.status-dot.online {
    background: var(--green);
}

.status-dot.offline {
    background: var(--gray-400);
}

.contact-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
}

/* ==================== CHAT REQUESTS PAGE STYLES ==================== */
.requests-page {
    padding: 0;
}

.requests-header {
    padding: 12px 16px;
    background: var(--white);
    border-bottom: 1px solid var(--gray-150);
    position: sticky;
    top: 0;
    z-index: 10;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    background: rgba(255, 255, 255, 0.92);
}

.requests-header h2 {
    font-size: 18px;
    font-weight: 700;
    color: var(--black);
}

.requests-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

.request-card {
    background: var(--white);
    border-radius: var(--radius-lg);
    padding: 16px;
    border: 1px solid var(--gray-150);
    margin-bottom: 12px;
    animation: fadeIn 0.3s ease;
}

.request-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
}

.request-avatar {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-circle);
    object-fit: cover;
    flex-shrink: 0;
}

.request-info {
    flex: 1;
    min-width: 0;
}

.request-info h4 {
    font-size: 15px;
    font-weight: 600;
    color: var(--black);
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.request-user-id {
    font-size: 12px;
    color: var(--gray-600);
    font-family: var(--font-mono);
    letter-spacing: 0.3px;
}

.request-actions {
    display: flex;
    gap: 8px;
}

.request-actions .action-btn {
    flex: 1;
    padding: 10px;
    font-size: 14px;
    font-weight: 600;
}

.accept-btn {
    background: var(--green);
    color: var(--white);
}

.accept-btn:hover {
    background: #2db34a;
}

.reject-btn {
    background: var(--red);
    color: var(--white);
}

.reject-btn:hover {
    background: #e53935;
}

/* ==================== DROPDOWN MENUS ==================== */
.dropdown {
    position: relative;
    display: inline-block;
}

.dropdown-content {
    display: none;
    position: absolute;
    right: 0;
    top: 100%;
    background: var(--white);
    min-width: 200px;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-heavy);
    z-index: 1000;
    border: 1px solid var(--gray-200);
    animation: dropdownFade 0.2s var(--transition-spring);
    margin-top: 8px;
    overflow: hidden;
}

.dropdown-content.show {
    display: block;
}

.dropdown-item {
    padding: 12px 16px;
    color: var(--black);
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    transition: all var(--transition-normal);
    border-bottom: 1px solid var(--gray-100);
    cursor: pointer;
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    font-family: var(--font-sf);
}

.dropdown-item:last-child {
    border-bottom: none;
}

.dropdown-item:hover {
    background: var(--gray-50);
    color: var(--blue);
}

.dropdown-item.danger {
    color: var(--red);
}

.dropdown-item.danger:hover {
    background: var(--red);
    color: var(--white);
}

/* ==================== TOAST NOTIFICATIONS ==================== */
.toast-container {
    position: fixed;
    top: 20px;
    right: 16px;
    z-index: 99999;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 300px;
}

.toast {
    background: var(--gray-900);
    color: var(--white);
    padding: 12px 16px;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-heavy);
    animation: slideInRight 0.3s var(--transition-spring), fadeOut 0.3s ease 2.7s forwards;
    display: flex;
    align-items: center;
    gap: 10px;
    position: relative;
    overflow: hidden;
    max-width: 100%;
}

.toast::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: rgba(255, 255, 255, 0.2);
    animation: toastProgress 3s linear forwards;
}

.toast.success {
    background: var(--green);
}

.toast.error {
    background: var(--red);
}

.toast.warning {
    background: var(--orange);
}

.toast.info {
    background: var(--blue);
}

.toast i {
    font-size: 16px;
    flex-shrink: 0;
}

.toast span {
    flex: 1;
    font-size: 14px;
    line-height: 1.3;
}

/* ==================== ANIMATIONS ==================== */
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(15px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes modalSlideUp {
    from {
        opacity: 0;
        transform: translateY(30px) scale(0.95);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes fadeOut {
    to {
        opacity: 0;
        transform: translateX(100%);
    }
}

@keyframes toastProgress {
    from { width: 100%; }
    to { width: 0%; }
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

@keyframes gentlePulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.9; }
}

@keyframes typing {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-4px); opacity: 1; }
}

@keyframes messageSlide {
    from {
        opacity: 0;
        transform: translateY(8px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes dropdownFade {
    from {
        opacity: 0;
        transform: translateY(-5px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes badgePulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}

/* ==================== RESPONSIVE DESIGN ==================== */
@media (max-width: 768px) {
    html {
        font-size: 14px;
    }
    
    .modal-content {
        max-width: 90vw;
        max-height: 85vh;
    }
    
    .message {
        max-width: 90%;
    }
    
    .attachment-options {
        grid-template-columns: repeat(3, 1fr);
        left: 8px;
        right: 8px;
        bottom: 65px;
    }
    
    .chat-media {
        max-width: 200px;
    }
    
    .floating-btn {
        bottom: 16px;
        right: 16px;
        width: 48px;
        height: 48px;
    }
    
    .nav-item span {
        display: none;
    }
    
    .nav-item {
        padding: 10px;
        max-width: 60px;
    }
    
    .nav-item i {
        font-size: 20px;
    }
}

@media (max-width: 480px) {
    html {
        font-size: 13.5px;
    }
    
    .auth-container {
        padding: var(--space-4);
    }
    
    .auth-form {
        padding: var(--space-5);
    }
    
    .modal-content {
        width: 100vw;
        height: 100vh;
        max-height: 100vh;
        border-radius: 0;
        max-width: 100%;
    }
    
    .modal-body {
        padding: 16px;
    }
    
    .chat-messages {
        padding: 12px;
    }
    
    .message-input-area {
        padding: 10px 12px;
    }
    
    .floating-btn {
        width: 44px;
        height: 44px;
        bottom: 12px;
        right: 12px;
    }
    
    .floating-btn i {
        font-size: 16px;
    }
    
    .toast-container {
        left: 12px;
        right: 12px;
        max-width: none;
        top: 12px;
    }
    
    .toast {
        max-width: 100%;
    }
}

/* High Contrast & Reduced Motion */
@media (prefers-contrast: high) {
    :root {
        --gray-200: #000000;
        --blue: #0040ff;
        --red: #c00000;
        --green: #008000;
    }
    
    .message-bubble {
        border: 1px solid var(--gray-300);
    }
}

@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}

/* Print Styles */
@media print {
    .floating-btn,
    .message-input-area,
    .app-nav,
    .profile-btn,
    .copy-btn,
    .back-btn,
    .icon-btn,
    .close-modal,
    .toast-container,
    .attachment-options,
    .chat-actions {
        display: none !important;
    }
    
    body {
        background: white !important;
        color: black !important;
    }
    
    .chat-messages {
        height: auto !important;
        overflow: visible !important;
        padding: 0 !important;
    }
    
    .message-bubble {
        break-inside: avoid;
    }
}

/* Loading States */
.loading {
    opacity: 0.6;
    pointer-events: none;
    position: relative;
}

.loading::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.7);
    z-index: 10;
    border-radius: inherit;
    backdrop-filter: blur(2px);
}

/* Utility Classes */
.hidden {
    display: none !important;
}

.visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

.text-truncate {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.flex-center {
    display: flex;
    align-items: center;
    justify-content: center;
}

.flex-between {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.flex-column {
    display: flex;
    flex-direction: column;
}

.gap-1 { gap: var(--space-1); }
.gap-2 { gap: var(--space-2); }
.gap-3 { gap: var(--space-3); }
.gap-4 { gap: var(--space-4); }

.mt-1 { margin-top: var(--space-1); }
.mt-2 { margin-top: var(--space-2); }
.mt-3 { margin-top: var(--space-3); }
.mt-4 { margin-top: var(--space-4); }

.mb-1 { margin-bottom: var(--space-1); }
.mb-2 { margin-bottom: var(--space-2); }
.mb-3 { margin-bottom: var(--space-3); }
.mb-4 { margin-bottom: var(--space-4); }

.p-1 { padding: var(--space-1); }
.p-2 { padding: var(--space-2); }
.p-3 { padding: var(--space-3); }
.p-4 { padding: var(--space-4); }

.text-sm { font-size: 12px; }
.text-base { font-size: 14px; }
.text-lg { font-size: 16px; }

.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }

.text-gray-500 { color: var(--gray-500); }
.text-gray-600 { color: var(--gray-600); }
.text-gray-700 { color: var(--gray-700); }
.text-blue { color: var(--blue); }
.text-red { color: var(--red); }
.text-green { color: var(--green); }

.bg-white { background: var(--white); }
.bg-gray-50 { background: var(--gray-50); }
.bg-gray-100 { background: var(--gray-100); }
.bg-blue { background: var(--blue); }

.rounded-sm { border-radius: var(--radius-sm); }
.rounded-md { border-radius: var(--radius-md); }
.rounded-lg { border-radius: var(--radius-lg); }
.rounded-full { border-radius: var(--radius-circle); }

.shadow-sm { box-shadow: var(--shadow-subtle); }
.shadow-md { box-shadow: var(--shadow-light); }
.shadow-lg { box-shadow: var(--shadow-medium); }

/* Location Message Styling */
.location-message {
    max-width: 240px;
    overflow: hidden;
}

.location-map {
    width: 100%;
    height: 120px;
    background: var(--gray-100);
    border-radius: var(--radius-md);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--gray-500);
    font-size: 24px;
    position: relative;
}

.location-map i {
    position: absolute;
}

.location-info {
    font-size: 12px;
    color: var(--gray-700);
}

.location-address {
    font-weight: 500;
    margin-bottom: 2px;
}

.location-details {
    color: var(--gray-600);
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

/* View Once Message */
.view-once-message {
    cursor: pointer;
    position: relative;
}

.view-once-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    border-radius: inherit;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    gap: 8px;
}

.view-once-overlay i {
    font-size: 24px;
}

.view-once-overlay span {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.5px;
}

/* Voice Message Styling */
.voice-message {
    max-width: 200px;
    padding: 12px;
    background: var(--gray-100);
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    gap: 10px;
}

.voice-play-btn {
    background: var(--blue);
    color: white;
    border: none;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-circle);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
}

.voice-waveform {
    flex: 1;
    height: 20px;
    background: linear-gradient(90deg, var(--blue) 30%, rgba(0, 122, 255, 0.2) 70%);
    border-radius: 10px;
    position: relative;
    overflow: hidden;
}

.voice-duration {
    font-size: 11px;
    color: var(--gray-600);
    white-space: nowrap;
    flex-shrink: 0;
}

/* Document Message */
.document-message {
    max-width: 200px;
    padding: 12px;
    background: var(--gray-100);
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    gap: 10px;
}

.document-icon {
    width: 36px;
    height: 36px;
    background: var(--blue);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 16px;
    flex-shrink: 0;
}

.document-info {
    flex: 1;
    min-width: 0;
}

.document-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--black);
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.document-size {
    font-size: 11px;
    color: var(--gray-600);
}

/* Progress Bar */
.progress-bar {
    width: 100%;
    height: 3px;
    background: var(--gray-200);
    border-radius: 1.5px;
    overflow: hidden;
    margin-top: 8px;
}

.progress-fill {
    height: 100%;
    background: var(--blue);
    border-radius: 1.5px;
    transition: width 0.3s ease;
}

/* Selection Styles */
::selection {
    background: rgba(0, 122, 255, 0.2);
    color: var(--black);
}

/* Focus Visible */
:focus-visible {
    outline: 2px solid var(--blue);
    outline-offset: 2px;
}

/* Scrollbar Styling */
::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}

::-webkit-scrollbar-track {
    background: transparent;
}

::-webkit-scrollbar-thumb {
    background: var(--gray-300);
    border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
    background: var(--gray-400);
}

/* iOS Safari specific */
@supports (-webkit-touch-callout: none) {
    body {
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
    }
    
    input, textarea {
        font-size: 16px; /* Prevents zoom on iOS */
    }
    
    .modal-overlay {
        -webkit-overflow-scrolling: touch;
    }
}
