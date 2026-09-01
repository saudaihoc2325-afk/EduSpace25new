/**
 * EduSpace25 - Assignment Utilities
 * QR Code generation, Download PNG, and Printable Classroom Handout formatting.
 */

import { Assignment } from '../types';
import { APP_NAME, ORG_NAME } from '../constants/gameTypes';

export function getDirectStudentLink(assignmentCode: string): string {
  if (typeof window === 'undefined') return `?code=${assignmentCode}`;
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}?code=${assignmentCode}`;
}

export function getQrCodeUrl(assignmentCode: string, size: number = 250): string {
  const link = getDirectStudentLink(assignmentCode);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(link)}`;
}

/**
 * Downloads QR code image directly as a PNG file.
 */
export async function downloadQrCodeImage(assignmentCode: string, title?: string): Promise<boolean> {
  try {
    const qrUrl = getQrCodeUrl(assignmentCode, 500);
    const response = await fetch(qrUrl);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    const safeTitle = (title || 'assignment')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .slice(0, 30);
    link.download = `EduSpace25_${safeTitle}_${assignmentCode}_QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
    return true;
  } catch (err) {
    console.error('Failed to download QR code image:', err);
    // Fallback: open QR in new tab
    const qrUrl = getQrCodeUrl(assignmentCode, 500);
    window.open(qrUrl, '_blank');
    return false;
  }
}

/**
 * Generates and triggers the printable classroom handout sheet.
 */
export function printAssignmentSheet(assignment: Assignment, orgName: string = ORG_NAME): void {
  const studentLink = getDirectStudentLink(assignment.assignmentCode);
  const qrUrl = getQrCodeUrl(assignment.assignmentCode, 300);

  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    alert('Please allow popups to print the assignment sheet.');
    return;
  }

  const printHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>EduSpace25 Assignment - ${assignment.assignmentCode}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 40px;
      line-height: 1.5;
    }

    .sheet {
      max-width: 680px;
      margin: 0 auto;
      border: 2px solid #e2e8f0;
      border-radius: 20px;
      padding: 36px;
      background: #ffffff;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }

    .brand-title {
      font-size: 24px;
      font-weight: 800;
      color: #4338ca;
      letter-spacing: -0.5px;
    }

    .brand-org {
      font-size: 13px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .activity-info {
      margin-bottom: 28px;
    }

    .activity-title {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 8px;
    }

    .meta-tags {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .tag {
      background: #f1f5f9;
      color: #334155;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 8px;
    }

    .tag-class {
      background: #e0e7ff;
      color: #4338ca;
    }

    .instructions {
      background: #f8fafc;
      border-left: 4px solid #4f46e5;
      padding: 12px 16px;
      border-radius: 0 10px 10px 0;
      font-size: 13px;
      color: #334155;
      margin-top: 12px;
    }

    .access-section {
      display: flex;
      gap: 24px;
      align-items: center;
      background: #f8fafc;
      border: 2px dashed #cbd5e1;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
    }

    .qr-container {
      background: #ffffff;
      padding: 12px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      text-align: center;
    }

    .qr-image {
      width: 160px;
      height: 160px;
      display: block;
    }

    .code-container {
      flex: 1;
    }

    .code-label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .code-box {
      font-family: monospace;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #4f46e5;
      background: #ffffff;
      border: 2px solid #e2e8f0;
      padding: 10px 16px;
      border-radius: 12px;
      display: inline-block;
      margin-bottom: 12px;
    }

    .steps-list {
      margin-top: 24px;
      border-top: 2px solid #f1f5f9;
      padding-top: 20px;
    }

    .steps-title {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 12px;
    }

    .step-item {
      display: flex;
      gap: 10px;
      font-size: 13px;
      color: #334155;
      margin-bottom: 8px;
    }

    .step-number {
      width: 22px;
      height: 22px;
      background: #4f46e5;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .link-text {
      word-break: break-all;
      font-size: 11px;
      color: #64748b;
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid #f1f5f9;
      text-align: center;
    }

    @media print {
      body {
        padding: 0;
      }
      .sheet {
        border: none;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <div class="brand-title">${APP_NAME}</div>
        <div class="brand-org">${orgName}</div>
      </div>
      <div style="text-align: right; font-size: 12px; color: #64748b;">
        <div><strong>Date:</strong> ${new Date().toLocaleDateString('vi-VN')}</div>
        <div>Class Activity Sheet</div>
      </div>
    </div>

    <div class="activity-info">
      <div class="activity-title">${assignment.title || assignment.activityTitle}</div>
      <div class="meta-tags">
        <span class="tag tag-class">Target Class: ${assignment.targetClass || 'All Classes'}</span>
        <span class="tag">Game: ${assignment.gameType.toUpperCase()}</span>
        ${assignment.timeLimitMinutes ? `<span class="tag">Time: ${assignment.timeLimitMinutes} mins</span>` : '<span class="tag">Untimed</span>'}
      </div>
      ${assignment.instructions ? `<div class="instructions"><strong>Instructions:</strong> ${assignment.instructions}</div>` : ''}
    </div>

    <div class="access-section">
      <div class="qr-container">
        <img class="qr-image" src="${qrUrl}" alt="Assignment QR Code" />
        <div style="font-size: 10px; font-weight: 700; color: #64748b; margin-top: 6px;">SCAN TO JOIN</div>
      </div>
      <div class="code-container">
        <div class="code-label">6-Digit Access Code</div>
        <div class="code-box">${assignment.assignmentCode}</div>
        <p style="font-size: 12px; color: #475569;">
          Open <strong>EduSpace25</strong> and enter this 6-digit code, or scan the QR code to join directly.
        </p>
      </div>
    </div>

    <div class="steps-list">
      <div class="steps-title">HƯỚNG DẪN HỌC SINH THAM GIA / STUDENT INSTRUCTIONS:</div>
      <div class="step-item">
        <div class="step-number">1</div>
        <div>Dùng camera điện thoại quét mã QR hoặc truy cập đường link liên kết bên dưới.</div>
      </div>
      <div class="step-item">
        <div class="step-number">2</div>
        <div>Nhập <strong>Họ và tên</strong> cùng <strong>Lớp</strong> của bạn (Không cần tạo tài khoản).</div>
      </div>
      <div class="step-item">
        <div class="step-number">3</div>
        <div>Bấm <strong>Bắt đầu làm bài</strong> và hoàn thành các câu hỏi để ghi nhận điểm số.</div>
      </div>
    </div>

    <div class="link-text">
      <strong>Direct Access Link:</strong> ${studentLink}
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(printHtml);
  printWindow.document.close();
}
