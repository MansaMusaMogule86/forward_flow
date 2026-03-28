import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignup: (data: {
    name: string;
    email: string;
  }) => void;
}
const SignupModal = ({
  isOpen,
  onClose,
  onSignup
}: SignupModalProps) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: ""
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;
    onSignup(formData);
    toast({
      title: "Welcome to your healing journey!",
      description: "You now have access to personalized resources and support."
    });
    onClose();
    setFormData({
      name: "",
      email: ""
    });
  };
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-background shadow-xl">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-foreground">GET STARTED</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                We believe in personalized, secure support — and that starts with understanding your journey.
                Join our community to unlock tools, guides, and resources tailored just for you.
              </p>
            </div>
            <button onClick={onClose} className="rounded p-2 hover:bg-accent">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">First Name</label>
              <Input type="text" value={formData.name} onChange={e => setFormData({
              ...formData,
              name: e.target.value
            })} placeholder="Enter your first name" required />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Email</label>
              <Input type="email" value={formData.email} onChange={e => setFormData({
              ...formData,
              email: e.target.value
            })} placeholder="Enter your email address" required />
            </div>

            <div className="rounded-lg bg-accent/50 p-4">
              <p className="text-xs text-muted-foreground">
                ✓ Free to join • ✓ Privacy protected • ✓ Cancel anytime • ✓ No spam, ever
              </p>
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                Get Started Free
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/login")} className="flex-1">
                Already a Member? Sign In
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>;
};
export default SignupModal;