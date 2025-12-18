import { Component, ChangeDetectionStrategy, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DbService } from '../../app/services/db.service';

// Declare Html5Qrcode global
declare var Html5Qrcode: any;

@Component({
  selector: 'app-redeem-coupon',
  templateUrl: './redeem-coupon.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink]
})
export class RedeemCouponComponent implements OnDestroy {

  private dbService = inject(DbService);
  private html5QrCode: any;

  redeemStatusMessage = signal<{ type: 'success' | 'error', title: string, text: string } | null>(null);
  isScannerVisible = signal(false);
  scannerErrorMessage = signal<string | null>(null);

  redeemCouponForm = new FormGroup({
    code: new FormControl('', [
      Validators.required,
      Validators.minLength(4),
      Validators.maxLength(4),
      Validators.pattern('^[0-9]*$')
    ])
  });

  ngOnDestroy() {
    this.stopScanner();
  }

  showScanner() {
    this.isScannerVisible.set(true);
    this.scannerErrorMessage.set(null);
    setTimeout(() => this.startScanner(), 100);
  }

  hideScanner() {
    this.stopScanner();
    this.isScannerVisible.set(false);
  }

  private startScanner() {
    const readerElementId = 'qr-reader-redeem';

    if (!document.getElementById(readerElementId)) {
      this.scannerErrorMessage.set('QR Reader could not be initialized. Please refresh.');
      return;
    }

    this.html5QrCode = new Html5Qrcode(readerElementId);
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    const onScanSuccess = (decodedText: string) => {
      this.redeemCouponForm.patchValue({ code: decodedText });
      this.handleRedeemCoupon();
      this.hideScanner();
    };

    this.html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, () => {})
      .catch(() => {
        this.scannerErrorMessage.set('Could not start scanner. Please allow camera access.');
      });
  }

  private stopScanner() {
    if (this.html5QrCode && this.html5QrCode.isScanning) {
      this.html5QrCode.stop().catch(() => {});
    }
  }

  private speak(text: string) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.2;
      window.speechSynthesis.speak(utterance);
    }
  }

  // 🔥 SUPABASE REDEEM
  async handleRedeemCoupon() {
    if (!this.redeemCouponForm.valid) return;

    const code = this.redeemCouponForm.value.code!;

    const result = await this.dbService.redeemCouponByCode(code);

    if (result.success) {
      this.redeemStatusMessage.set({
        type: 'success',
        title: 'Coupon Redeemed Successfully',
        text: result.message
      });
      this.speak('Coupon redeemed successfully');
    } else {
      let title = 'Error Redeeming Coupon';

      if (result.message === 'This coupon has already been redeemed.') {
        title = 'Coupon Already Redeemed';
        this.speak('Coupon already redeemed');
      } else if (result.message === 'Invalid coupon code.') {
        title = 'Coupon Not Available';
        this.speak('Coupon not available');
      } else {
        this.speak(result.message);
      }

      this.redeemStatusMessage.set({
        type: 'error',
        title,
        text: result.message
      });
    }

    this.redeemCouponForm.reset();
    setTimeout(() => this.redeemStatusMessage.set(null), 5000);
  }
}
