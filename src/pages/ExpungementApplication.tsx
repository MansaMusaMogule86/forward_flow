import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { 
  Lock, ArrowLeft, CheckCircle, AlertCircle, 
  FileText, Shield, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SEOHead } from "@/components/seo/SEOHead";
import { Link, Navigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const steps = [
  { id: 1, title: "Eligibility Check" },
  { id: 2, title: "Personal Info" },
  { id: 3, title: "Record Details" },
  { id: 4, title: "Review & Submit" }
];

export default function ExpungementApplication() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    // Eligibility
    isOhioResident: '',
    hasCompletedSentence: '',
    convictionType: '',
    waitingPeriodMet: '',
    noPendingCharges: '',

    // Personal Info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    county: '',
    city: '',
    annualIncome: '',

    // Record Details
    convictionDate: '',
    offenseDescription: '',
    courtCaseNumber: '',
    convictionCounty: '',
    completedProbation: '',
    restitutionPaid: '',
    additionalInfo: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const checkEligibility = () => {
    return (
      formData.isOhioResident === 'yes' &&
      formData.hasCompletedSentence === 'yes' &&
      formData.noPendingCharges === 'yes' &&
      (formData.convictionType === 'f4-f5-felony' || formData.convictionType === 'misdemeanor')
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Store application in database
      const { error } = await supabase
        .from('expungement_applications')
        .insert({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          county: formData.county,
          city: formData.city,
          annual_income: formData.annualIncome,
          conviction_type: formData.convictionType,
          conviction_date: formData.convictionDate,
          offense_description: formData.offenseDescription,
          court_case_number: formData.courtCaseNumber || null,
          conviction_county: formData.convictionCounty,
          probation_completed: formData.completedProbation === 'yes',
          restitution_paid: formData.restitutionPaid === 'yes',
          additional_info: formData.additionalInfo || null,
          status: 'pending_review'
        });

      if (error) throw error;

      // Send notification email
      await supabase.functions.invoke('send-contact-email', {
        body: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          subject: 'New Expungement Program Application',
          message: `New application received from ${formData.firstName} ${formData.lastName} in ${formData.county} County.`,
          type: 'expungement_application'
        }
      });

      setIsSubmitted(true);
      toast({
        title: "Application Submitted",
        description: "We'll review your application and respond within 3-5 business days."
      });
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: "Error",
        description: "There was an error submitting your application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/5 rounded-2xl p-8 border border-white/10 text-center">
          <div className="w-16 h-16 bg-[#bf8c4e]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-[#bf8c4e]" />
          </div>
          <h1 className="text-2xl font-bold text-[#f0e6d2] mb-4 font-display">
            Application Received
          </h1>
          <p className="text-[#e8e4dc]/70 mb-6">
            Thank you for applying to our Elite Expungement Program. 
            Our team will review your application and contact you within 3-5 business days.
          </p>
          <div className="bg-[#bf8c4e]/10 rounded-lg p-4 mb-6">
            <p className="text-sm text-[#e8e4dc]/80">
              <strong>Reference Number:</strong> EXP-{Date.now().toString().slice(-8)}
            </p>
          </div>
          <Button asChild className="w-full bg-[#bf8c4e] hover:bg-[#bf8c4e]/90 text-[#0a1628]">
            <Link to="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Expungement Program Application"
        description="Apply for Ohio's Elite Expungement Program. Comprehensive expungement support for all 88 counties."
        path="/expungement-application"
      />

      <div className="min-h-screen bg-[#0a1628] py-12">
        <div className="container-custom max-w-3xl">
          {/* Header */}
          <div className="mb-8">
            <Link to="/expungement-program" className="inline-flex items-center gap-2 text-[#e8e4dc]/60 hover:text-[#bf8c4e] mb-6">
              <ArrowLeft className="h-4 w-4" />
              Back to Program Details
            </Link>

            <div className="flex items-center gap-3 mb-4">
              <Lock className="h-6 w-6 text-[#bf8c4e]" />
              <h1 className="text-2xl font-bold text-[#f0e6d2] font-display">
                Program Application
              </h1>
            </div>
            <p className="text-[#e8e4dc]/60">
              Complete this application to be considered for our Elite Expungement Program. 
              Not all applicants are accepted.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step.id 
                    ? 'bg-[#bf8c4e] text-[#0a1628]' 
                    : 'bg-white/10 text-[#e8e4dc]/50'
                }`}>
                  {currentStep > step.id ? <CheckCircle className="h-4 w-4" /> : step.id}
                </div>
                <span className={`ml-2 text-sm hidden sm:block ${
                  currentStep >= step.id ? 'text-[#e8e4dc]' : 'text-[#e8e4dc]/50'
                }`}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-4 ${
                    currentStep > step.id ? 'bg-[#bf8c4e]' : 'bg-white/10'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Form Steps */}
          <div className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">
            {/* Step 1: Eligibility */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="h-5 w-5 text-[#bf8c4e]" />
                  <h2 className="text-lg font-semibold text-[#f0e6d2]">Eligibility Check</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-[#e8e4dc]">Are you an Ohio resident or do you have Ohio convictions?</Label>
                    <select 
                      name="isOhioResident"
                      value={formData.isOhioResident}
                      onChange={handleInputChange}
                      className="w-full mt-2 bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-[#f0e6d2] focus:border-[#bf8c4e] focus:outline-none"
                    >
                      <option value="">Select...</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-[#e8e4dc]">Have you completed all sentence requirements (probation, parole, fines)?</Label>
                    <select 
                      name="hasCompletedSentence"
                      value={formData.hasCompletedSentence}
                      onChange={handleInputChange}
                      className="w-full mt-2 bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-[#f0e6d2] focus:border-[#bf8c4e] focus:outline-none"
                    >
                      <option value="">Select...</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                      <option value="unsure">Unsure</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-[#e8e4dc]">What type of conviction(s) are you seeking to expunge?</Label>
                    <select 
                      name="convictionType"
                      value={formData.convictionType}
                      onChange={handleInputChange}
                      className="w-full mt-2 bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-[#f0e6d2] focus:border-[#bf8c4e] focus:outline-none"
                    >
                      <option value="">Select...</option>
                      <option value="misdemeanor">Misdemeanor(s)</option>
                      <option value="f4-f5-felony">4th or 5th Degree Felony</option>
                      <option value="f3-felony">3rd Degree Felony</option>
                      <option value="f1-f2-felony">1st or 2nd Degree Felony (NOT eligible)</option>
                      <option value="violent">Violent Offense (NOT eligible)</option>
                      <option value="unsure">Unsure</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-[#e8e4dc]">Do you have any pending criminal charges?</Label>
                    <select 
                      name="noPendingCharges"
                      value={formData.noPendingCharges}
                      onChange={handleInputChange}
                      className="w-full mt-2 bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-[#f0e6d2] focus:border-[#bf8c4e] focus:outline-none"
                    >
                      <option value="">Select...</option>
                      <option value="yes">No pending charges</option>
                      <option value="no">Yes, I have pending charges</option>
                    </select>
                  </div>
                </div>

                {!checkEligibility() && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3">
                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-red-200 text-sm font-medium">Eligibility Concern</p>
                      <p className="text-red-200/70 text-sm">
                        Based on your answers, you may not qualify for our program. 
                        However, you can still submit for a manual review.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Personal Info */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <FileText className="h-5 w-5 text-[#bf8c4e]" />
                  <h2 className="text-lg font-semibold text-[#f0e6d2]">Personal Information</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#e8e4dc]">First Name</Label>
                    <Input 
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="mt-2 bg-white/5 border-white/20 text-[#f0e6d2]"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-[#e8e4dc]">Last Name</Label>
                    <Input 
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="mt-2 bg-white/5 border-white/20 text-[#f0e6d2]"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#e8e4dc]">Email</Label>
                    <Input 
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="mt-2 bg-white/5 border-white/20 text-[#f0e6d2]"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-[#e8e4dc]">Phone</Label>
                    <Input 
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="mt-2 bg-white/5 border-white/20 text-[#f0e6d2]"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#e8e4dc]">City</Label>
                    <Input 
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="mt-2 bg-white/5 border-white/20 text-[#f0e6d2]"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-[#e8e4dc]">County</Label>
                    <Input 
                      name="county"
                      value={formData.county}
                      onChange={handleInputChange}
                      className="mt-2 bg-white/5 border-white/20 text-[#f0e6d2]"
                      placeholder="e.g., Franklin"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[#e8e4dc]">Annual Household Income</Label>
                  <select 
                    name="annualIncome"
                    value={formData.annualIncome}
                    onChange={handleInputChange}
                    className="w-full mt-2 bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-[#f0e6d2] focus:border-[#bf8c4e] focus:outline-none"
                  >
                    <option value="">Select...</option>
                    <option value="under-25k">Under $25,000 (Pro-bono tier may apply)</option>
                    <option value="25k-40k">$25,000 - $40,000</option>
                    <option value="40k-60k">$40,000 - $60,000</option>
                    <option value="over-60k">Over $60,000</option>
                    <option value="prefer-not">Prefer not to say</option>
                  </select>
                  <p className="text-xs text-[#e8e4dc]/50 mt-2">
                    Income information helps us determine if you qualify for pro-bono services.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Record Details */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <Clock className="h-5 w-5 text-[#bf8c4e]" />
                  <h2 className="text-lg font-semibold text-[#f0e6d2]">Record Details</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#e8e4dc]">Conviction Date (Approximate)</Label>
                    <Input 
                      type="date"
                      name="convictionDate"
                      value={formData.convictionDate}
                      onChange={handleInputChange}
                      className="mt-2 bg-white/5 border-white/20 text-[#f0e6d2]"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-[#e8e4dc]">Conviction County</Label>
                    <Input 
                      name="convictionCounty"
                      value={formData.convictionCounty}
                      onChange={handleInputChange}
                      className="mt-2 bg-white/5 border-white/20 text-[#f0e6d2]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[#e8e4dc]">Court Case Number (if known)</Label>
                  <Input 
                    name="courtCaseNumber"
                    value={formData.courtCaseNumber}
                    onChange={handleInputChange}
                    className="mt-2 bg-white/5 border-white/20 text-[#f0e6d2]"
                    placeholder="e.g., CR-2020-1234"
                  />
                </div>

                <div>
                  <Label className="text-[#e8e4dc]">Offense Description</Label>
                  <Textarea 
                    name="offenseDescription"
                    value={formData.offenseDescription}
                    onChange={handleInputChange}
                    className="mt-2 bg-white/5 border-white/20 text-[#f0e6d2]"
                    placeholder="Briefly describe the offense(s) you want to expunge..."
                    rows={3}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#e8e4dc]">Did you complete probation/parole?</Label>
                    <select 
                      name="completedProbation"
                      value={formData.completedProbation}
                      onChange={handleInputChange}
                      className="w-full mt-2 bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-[#f0e6d2] focus:border-[#bf8c4e] focus:outline-none"
                    >
                      <option value="">Select...</option>
                      <option value="yes">Yes, completed</option>
                      <option value="no">No, still on probation</option>
                      <option value="na">N/A - No probation given</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[#e8e4dc]">Were all fines/restitution paid?</Label>
                    <select 
                      name="restitutionPaid"
                      value={formData.restitutionPaid}
                      onChange={handleInputChange}
                      className="w-full mt-2 bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-[#f0e6d2] focus:border-[#bf8c4e] focus:outline-none"
                    >
                      <option value="">Select...</option>
                      <option value="yes">Yes, all paid</option>
                      <option value="no">No, still owe</option>
                      <option value="na">N/A - No fines/restitution</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="text-[#e8e4dc]">Additional Information (Optional)</Label>
                  <Textarea 
                    name="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={handleInputChange}
                    className="mt-2 bg-white/5 border-white/20 text-[#f0e6d2]"
                    placeholder="Any other details about your case, employment goals, or circumstances..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <CheckCircle className="h-5 w-5 text-[#bf8c4e]" />
                  <h2 className="text-lg font-semibold text-[#f0e6d2]">Review & Submit</h2>
                </div>

                <div className="space-y-4 bg-white/5 rounded-lg p-4">
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[#e8e4dc]/60">Name:</span>
                      <p className="text-[#f0e6d2]">{formData.firstName} {formData.lastName}</p>
                    </div>
                    <div>
                      <span className="text-[#e8e4dc]/60">Contact:</span>
                      <p className="text-[#f0e6d2]">{formData.email}</p>
                      <p className="text-[#f0e6d2]">{formData.phone}</p>
                    </div>
                    <div>
                      <span className="text-[#e8e4dc]/60">Location:</span>
                      <p className="text-[#f0e6d2]">{formData.city}, {formData.county} County</p>
                    </div>
                    <div>
                      <span className="text-[#e8e4dc]/60">Conviction Type:</span>
                      <p className="text-[#f0e6d2]">{formData.convictionType}</p>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <span className="text-[#e8e4dc]/60 text-sm">Offense Description:</span>
                    <p className="text-[#f0e6d2] text-sm mt-1">{formData.offenseDescription}</p>
                  </div>
                </div>

                <div className="bg-[#bf8c4e]/10 border border-[#bf8c4e]/30 rounded-lg p-4">
                  <p className="text-sm text-[#e8e4dc]/80">
                    <strong className="text-[#bf8c4e]">Important:</strong> By submitting this application, 
                    you confirm that all information provided is accurate to the best of your knowledge. 
                    Providing false information may result in denial of service.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    id="consent"
                    className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 text-[#bf8c4e] focus:ring-[#bf8c4e]"
                    required
                  />
                  <label htmlFor="consent" className="text-sm text-[#e8e4dc]/80">
                    I understand that this is an application only and does not guarantee acceptance 
                    into the program. I consent to being contacted about my application.
                  </label>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="border-white/20 text-[#e8e4dc] hover:bg-white/5"
                >
                  Previous
                </Button>
              ) : (
                <div />
              )}

              {currentStep < 4 ? (
                <Button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  className="bg-[#bf8c4e] hover:bg-[#bf8c4e]/90 text-[#0a1628]"
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-[#bf8c4e] hover:bg-[#bf8c4e]/90 text-[#0a1628]"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              )}
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-8 text-center">
            <p className="text-sm text-[#e8e4dc]/50">
              Have questions? Contact us at{" "}
              <a href="mailto:support@forwardfocuselevation.org" className="text-[#bf8c4e] hover:underline">
                support@forwardfocuselevation.org
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
