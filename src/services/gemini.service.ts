import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';
import { Employee } from '../models/user.model';
import { Coupon } from '../models/coupon.model';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    // ✅ Browser-safe API key handling
    if (environment.geminiApiKey) {
      this.ai = new GoogleGenAI({
        apiKey: environment.geminiApiKey
      });
    } else {
      console.warn('Gemini API key not configured');
    }
  }

  async generateInsights(
    question: string,
    employees: Employee[],
    coupons: Coupon[]
  ): Promise<string> {

    if (!this.ai) {
      return 'AI insights service is not configured.';
    }

    /* ========= Simplified data ========= */
    const simplifiedEmployees = employees.map(emp => ({
      id: emp.id,
      role: emp.role,
      department: emp.department || 'N/A',
      contractor: emp.contractor || 'N/A'
    }));

    const simplifiedCoupons = coupons.map(c => ({
      employeeId: c.employeeId,
      couponType: c.couponType,
      status: c.status,
      dateIssued: c.dateIssued?.split('T')[0],
      redeemDate: c.redeemDate ? c.redeemDate.split('T')[0] : null
    }));

    const jsonData = JSON.stringify({
      employees: simplifiedEmployees,
      coupons: simplifiedCoupons
    });

    /* ========= Prompt ========= */
    const prompt = `
You are an AI assistant for a Canteen Management System.

Analyze the JSON data and answer the user's question about coupon usage.

Date: ${new Date().toISOString().split('T')[0]}

Rules:
- Be concise
- Use bullet points where helpful
- Base answers strictly on the data

JSON Data:
${jsonData}

User Question:
"${question}"
`;

    /* ========= Gemini call ========= */
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      return response.text || 'No response generated.';
    } catch (error) {
      console.error('Gemini API error:', error);
      return 'Failed to fetch AI insights.';
    }
  }
}
