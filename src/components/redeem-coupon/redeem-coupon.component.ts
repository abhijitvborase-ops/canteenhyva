import { Component, ChangeDetectionStrategy, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { RouterLink } from '@angular/router';

// Declare Html5Qrcode global
declare var Html5Qrcode: any;

@Component({
  selector: 'app-redeem-coupon',
  templateUrl: './redeem-coupon.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink]
})
export class RedeemCouponComponent implements OnDestroy {
  private dataService = inject(DataService);
  private html5QrCode: any;

  redeemStatusMessage = signal<{ type: 'success' | 'error', title: string, text: string } | null>(null);
  isScannerVisible = signal(false);
  scannerErrorMessage = signal<string | null>(null);

  redeemCouponForm = new FormGroup({
    code: new FormControl('', [Validators.required, Validators.minLength(4), Validators.maxLength(4), Validators.pattern('^[0-9]*$')])
  });

  ngOnDestroy() {
    this.stopScanner();
  }
  
  showScanner() {
    this.isScannerVisible.set(true);
    this.scannerErrorMessage.set(null);
    // Use timeout to ensure the DOM element for the scanner is rendered
    setTimeout(() => this.startScanner(), 100);
  }
  
  hideScanner() {
    this.stopScanner();
    this.isScannerVisible.set(false);
  }

  private startScanner() {
    const readerElementId = 'qr-reader-redeem';
    if (!document.getElementById(readerElementId)) {
      this.scannerErrorMessage.set('QR Reader element could not be initialized. Please refresh.');
      console.error('QR Reader element not found in DOM.');
      return;
    }

    this.html5QrCode = new Html5Qrcode(readerElementId);
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    const onScanSuccess = (decodedText: string) => {
      this.redeemCouponForm.patchValue({ code: decodedText });
      this.handleRedeemCoupon();
      this.hideScanner(); // Stop scanner on success
    };

    const onScanFailure = (error: string) => {};

    this.html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure)
      .catch((err: any) => {
        console.error('Unable to start QR scanner', err);
        this.scannerErrorMessage.set('Could not start scanner. Please check camera permissions.');
      });
  }
  
  private stopScanner() {
    if (this.html5QrCode && this.html5QrCode.isScanning) {
        this.html5QrCode.stop()
            .catch((err: any) => console.error("Error stopping the scanner.", err));
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

  // FIX: Make method async and await the service call result.
  async handleRedeemCoupon() {
    if (this.redeemCouponForm.valid) {
      const code = this.redeemCouponForm.value.code!;
      const result = await this.dataService.redeemCouponByCode(code);

      if (result.success) {
        this.redeemStatusMessage.set({ type: 'success', title: 'Coupon Redeemed Successfully', text: result.message });
        this.speak('Coupon redeemed successfully');
      } else {
        let title = 'Error Redeeming Coupon';
        let message = result.message;
        if (result.message === 'This coupon has already been redeemed.') {
            title = 'Coupon Already Redeemed';
            this.speak('Coupon already redeemed');
        } else if (result.message === 'Invalid coupon code.') {
            title = 'Coupon Not Available';
            message = 'The entered coupon code is invalid or does not exist.';
            this.speak('Coupon not available');
        } else {
            this.speak(result.message);
        }
        this.redeemStatusMessage.set({ type: 'error', title: title, text: message });
      }

      this.redeemCouponForm.reset();
      
      setTimeout(() => this.redeemStatusMessage.set(null), 5000);
    }
  }
}
