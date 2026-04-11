import { useState } from "react";
import {
    ArrowLeft, CheckCircle, Users, Shield, FileText, Rocket
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SEOHead } from "@/components/seo/SEOHead";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const steps = [
    { id: 1, title: "Age & Eligibility" },
    { id: 2, title: "Personal Info" },
    { id: 3, title: "Background" },
    { id: 4, title: "Review & Submit" }
];

export default function YouthApplication() {
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [consent, setConsent] = useState(false);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        // Eligibility
        ageGroup: '',
        isJusticeImpacted: '',
        referralSource: '',

        // Personal Info
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        city: '',
        state: 'Ohio',

        // Background
        currentSituation: '',
        goals: '',
        hearAboutUs: '',
        additionalInfo: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const validateStep = (step: number) => {
        switch (step) {
            case 1:
                return formData.ageGroup && formData.isJusticeImpacted;
            case 2:
                return formData.firstName && formData.lastName && formData.email && formData.phone && formData.city;
            case 3:
                return formData.currentSituation && formData.goals;
            default:
                return true;
        }
    };

    const nextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => prev + 1);
            window.scrollTo(0, 0);
        } else {
            toast({
                title: "Missing Information",
                description: "Please complete all required fields before continuing.",
                variant: "destructive"
            });
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => prev - 1);
        window.scrollTo(0, 0);
    };

    const handleSubmit = async () => {
        if (!consent) {
            toast({
                title: "Consent Required",
                description: "Please agree to the processing of your information to continue.",
                variant: "destructive"
            });
            return;
        }

        setIsSubmitting(true);

        try {
            const { error } = await supabase
                .from('youth_applications')
                .insert({
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    email: formData.email,
                    phone: formData.phone,
                    city: formData.city,
                    state: formData.state,
                    age_group: formData.ageGroup,
                    is_justice_impacted: formData.isJusticeImpacted === 'yes',
                    referral_source: formData.referralSource || null,
                    current_situation: formData.currentSituation,
                    goals: formData.goals,
                    hear_about_us: formData.hearAboutUs || null,
                    additional_info: formData.additionalInfo || null,
                    status: 'pending_review'
                });

            if (error) throw error;

            try {
                await supabase.functions.invoke('send-contact-email', {
                    body: {
                        name: `${formData.firstName} ${formData.lastName}`,
                        email: formData.email,
                        subject: 'New Youth Futures Program Application',
                        message: `New youth application received from ${formData.firstName} ${formData.lastName}.\n\nAge Group: ${formData.ageGroup}\nCity: ${formData.city}\nGoals: ${formData.goals}`,
                        type: 'youth_application'
                    }
                });
            } catch (emailError) {
                console.error('Email notification failed (non-critical):', emailError);
            }

            setIsSubmitted(true);
            toast({
                title: "Application Submitted!",
                description: "We'll review your application and reach out within 3-5 business days."
            });
        } catch (error) {
            console.error('Error submitting application:', error);
            toast({
                title: "Submission Failed",
                description: "There was an error saving your application. Please try again.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-osu-gray-dark flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white/5 rounded-2xl p-8 border border-white/10 text-center">
                    <div className="w-16 h-16 bg-osu-scarlet/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="h-8 w-8 text-osu-scarlet" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-4 font-heading">
                        Application Received!
                    </h1>
                    <p className="text-white/70 mb-6">
                        Thank you for applying to the Youth Futures Elevation Program.
                        Our team will review your application and contact you within 3–5 business days.
                    </p>
                    <div className="bg-osu-scarlet/10 rounded-lg p-4 mb-6">
                        <p className="text-sm text-white/80">
                            <strong>Reference:</strong> YFP-{Date.now().toString().slice(-8)}
                        </p>
                    </div>
                    <Button asChild className="w-full bg-osu-scarlet hover:bg-osu-scarlet/90 text-white">
                        <Link to="/youth-futures">Back to Youth Futures</Link>
                    </Button>
                </div>
            </div>
        );
    }

    const selectClass = "w-full mt-2 bg-[#1a1a1a] border border-white/20 rounded-lg px-4 py-3 text-white focus:border-osu-scarlet focus:outline-none [&>option]:bg-[#1a1a1a] [&>option]:text-white";

    return (
        <>
            <SEOHead
                title="Apply to Youth Futures Elevation Program"
                description="Apply for the Youth Futures Elevation Program — 100% free AI-powered career tools and mentorship for justice-impacted youth ages 14–25."
                path="/youth-application"
            />

            <div className="min-h-screen bg-osu-gray-dark py-12">
                <div className="container max-w-3xl px-4">
                    {/* Header */}
                    <div className="mb-8">
                        <Link to="/youth-futures" className="inline-flex items-center gap-2 text-white/60 hover:text-osu-scarlet mb-6 transition-colors">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Youth Futures
                        </Link>
                        <div className="flex items-center gap-3 mb-4">
                            <Rocket className="h-6 w-6 text-osu-scarlet" />
                            <h1 className="text-2xl font-bold text-white font-heading">
                                Youth Futures Application
                            </h1>
                        </div>
                        <p className="text-white/60">
                            100% FREE to participate. Complete this short application to join the program.
                        </p>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center justify-between mb-8">
                        {steps.map((step, index) => (
                            <div key={step.id} className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= step.id
                                    ? 'bg-osu-scarlet text-white'
                                    : 'bg-white/10 text-white/50'
                                    }`}>
                                    {currentStep > step.id ? <CheckCircle className="h-4 w-4" /> : step.id}
                                </div>
                                <span className={`ml-2 text-sm hidden sm:block ${currentStep >= step.id ? 'text-white' : 'text-white/50'
                                    }`}>
                                    {step.title}
                                </span>
                                {index < steps.length - 1 && (
                                    <div className={`w-8 sm:w-12 h-0.5 mx-2 sm:mx-4 ${currentStep > step.id ? 'bg-osu-scarlet' : 'bg-white/10'
                                        }`} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Form */}
                    <div className="bg-white/5 rounded-2xl p-6 md:p-8 border border-white/10">

                        {/* Step 1: Eligibility */}
                        {currentStep === 1 && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <Shield className="h-5 w-5 text-osu-scarlet" />
                                    <h2 className="text-lg font-semibold text-white">Age Group & Eligibility</h2>
                                </div>

                                <div>
                                    <Label className="text-white/90">Which age group applies to you? *</Label>
                                    <select name="ageGroup" value={formData.ageGroup} onChange={handleInputChange} className={selectClass}>
                                        <option value="">Select age group...</option>
                                        <option value="14-20">Group 1: Ages 14–20</option>
                                        <option value="20-25">Group 2: Ages 20–25</option>
                                    </select>
                                </div>

                                <div>
                                    <Label className="text-white/90">Are you justice-impacted or community-referred? *</Label>
                                    <select name="isJusticeImpacted" value={formData.isJusticeImpacted} onChange={handleInputChange} className={selectClass}>
                                        <option value="">Select...</option>
                                        <option value="yes">Yes — justice-impacted</option>
                                        <option value="referred">Yes — community-referred</option>
                                        <option value="no">No</option>
                                    </select>
                                </div>

                                <div>
                                    <Label className="text-white/90">If referred, who referred you? (optional)</Label>
                                    <Input
                                        name="referralSource"
                                        value={formData.referralSource}
                                        onChange={handleInputChange}
                                        placeholder="Organization, school, court, etc."
                                        className="mt-2 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-osu-scarlet"
                                    />
                                </div>

                                <div className="bg-osu-scarlet/10 rounded-lg p-4 border border-osu-scarlet/20">
                                    <p className="text-sm text-white/80">
                                        <strong className="text-white">Good news:</strong> Participation is 100% FREE for all eligible youth. Sponsorships cover all costs.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Personal Info */}
                        {currentStep === 2 && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <Users className="h-5 w-5 text-osu-scarlet" />
                                    <h2 className="text-lg font-semibold text-white">Personal Information</h2>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-white/90">First Name *</Label>
                                        <Input name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="First name" className="mt-2 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-osu-scarlet" />
                                    </div>
                                    <div>
                                        <Label className="text-white/90">Last Name *</Label>
                                        <Input name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Last name" className="mt-2 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-osu-scarlet" />
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-white/90">Email Address *</Label>
                                    <Input name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="your@email.com" className="mt-2 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-osu-scarlet" />
                                </div>

                                <div>
                                    <Label className="text-white/90">Phone Number *</Label>
                                    <Input name="phone" type="tel" value={formData.phone} onChange={handleInputChange} placeholder="(000) 000-0000" className="mt-2 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-osu-scarlet" />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-white/90">City *</Label>
                                        <Input name="city" value={formData.city} onChange={handleInputChange} placeholder="Your city" className="mt-2 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-osu-scarlet" />
                                    </div>
                                    <div>
                                        <Label className="text-white/90">State</Label>
                                        <Input name="state" value={formData.state} onChange={handleInputChange} placeholder="State" className="mt-2 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-osu-scarlet" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Background */}
                        {currentStep === 3 && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <FileText className="h-5 w-5 text-osu-scarlet" />
                                    <h2 className="text-lg font-semibold text-white">Your Background & Goals</h2>
                                </div>

                                <div>
                                    <Label className="text-white/90">Briefly describe your current situation *</Label>
                                    <Textarea
                                        name="currentSituation"
                                        value={formData.currentSituation}
                                        onChange={handleInputChange}
                                        placeholder="Tell us a little about where you are right now..."
                                        rows={4}
                                        className="mt-2 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-osu-scarlet resize-none"
                                    />
                                </div>

                                <div>
                                    <Label className="text-white/90">What do you hope to achieve through this program? *</Label>
                                    <Textarea
                                        name="goals"
                                        value={formData.goals}
                                        onChange={handleInputChange}
                                        placeholder="Career goals, skills you want to learn, life changes you're working toward..."
                                        rows={4}
                                        className="mt-2 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-osu-scarlet resize-none"
                                    />
                                </div>

                                <div>
                                    <Label className="text-white/90">How did you hear about the Youth Futures program? (optional)</Label>
                                    <Input
                                        name="hearAboutUs"
                                        value={formData.hearAboutUs}
                                        onChange={handleInputChange}
                                        placeholder="Social media, school, a friend, etc."
                                        className="mt-2 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-osu-scarlet"
                                    />
                                </div>

                                <div>
                                    <Label className="text-white/90">Anything else you'd like us to know? (optional)</Label>
                                    <Textarea
                                        name="additionalInfo"
                                        value={formData.additionalInfo}
                                        onChange={handleInputChange}
                                        placeholder="Additional context, questions, or notes..."
                                        rows={3}
                                        className="mt-2 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-osu-scarlet resize-none"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 4: Review */}
                        {currentStep === 4 && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <CheckCircle className="h-5 w-5 text-osu-scarlet" />
                                    <h2 className="text-lg font-semibold text-white">Review & Submit</h2>
                                </div>

                                <div className="space-y-4">
                                    {[
                                        { label: 'Name', value: `${formData.firstName} ${formData.lastName}` },
                                        { label: 'Email', value: formData.email },
                                        { label: 'Phone', value: formData.phone },
                                        { label: 'Location', value: `${formData.city}, ${formData.state}` },
                                        { label: 'Age Group', value: formData.ageGroup === '14-20' ? 'Group 1: Ages 14–20' : 'Group 2: Ages 20–25' },
                                        { label: 'Justice-Impacted', value: formData.isJusticeImpacted === 'yes' ? 'Yes — justice-impacted' : formData.isJusticeImpacted === 'referred' ? 'Yes — community-referred' : 'No' },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="flex justify-between py-2 border-b border-white/10">
                                            <span className="text-white/60 text-sm">{label}</span>
                                            <span className="text-white text-sm font-medium text-right max-w-xs">{value}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-white/5 rounded-lg p-4">
                                    <p className="text-sm text-white/70 font-medium mb-1">Your Goals</p>
                                    <p className="text-sm text-white/90">{formData.goals}</p>
                                </div>

                                <div className="flex items-start gap-3 mt-6">
                                    <input
                                        type="checkbox"
                                        id="consent"
                                        checked={consent}
                                        onChange={e => setConsent(e.target.checked)}
                                        className="mt-1 accent-osu-scarlet w-4 h-4 cursor-pointer"
                                    />
                                    <label htmlFor="consent" className="text-sm text-white/70 cursor-pointer">
                                        I consent to Forward Focus Foundation processing my information to evaluate my application and contact me about program enrollment. I understand this is 100% free.
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
                            {currentStep > 1 ? (
                                <Button variant="outline" onClick={prevStep} className="border-white/20 text-white hover:bg-white/10">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back
                                </Button>
                            ) : (
                                <div />
                            )}

                            {currentStep < 4 ? (
                                <Button onClick={nextStep} className="bg-osu-scarlet hover:bg-osu-scarlet/90 text-white">
                                    Continue
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="bg-osu-scarlet hover:bg-osu-scarlet/90 text-white px-8"
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
