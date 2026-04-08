import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { StructuredData } from '@/components/seo/StructuredData';
import { HelpCircle } from 'lucide-react';

const FAQ_ITEMS = [
  {
    question: 'What is Forward Focus Elevation?',
    answer:
      'Forward Focus Elevation is a nonprofit organization empowering justice-impacted families with AI-powered tools, trauma-informed coaching, and community resources to rebuild and thrive. We launched in Ohio and are expanding nationally.',
  },
  {
    question: 'Who does Forward Focus Elevation serve?',
    answer:
      'We serve justice-impacted individuals, their families, crime victims, and at-risk youth in two age groups: 14-20 and 20-25. Our programs include reentry support, victim advocacy, career coaching, and wellness tools - all free of charge.',
  },
  {
    question: 'How do I get help after incarceration?',
    answer:
      'Visit our Get Help Now page to access our AI-powered Reentry Navigator, which connects you to housing, employment, legal aid, and community resources in Ohio. You can also book a free coaching call with Coach Kay.',
  },
  {
    question: 'What free resources are available for crime victims?',
    answer:
      'Our Healing Hub provides trauma-informed wellness tools including guided breathing exercises, somatic release, journaling, and AI-powered victim support. We also connect survivors to Ohio crisis lines, legal aid, and advocacy organizations.',
  },
  {
    question: 'How can organizations partner with Forward Focus Elevation?',
    answer:
      'Nonprofits, government agencies, and community organizations can apply to become verified partners. Partners gain access to our referral network, co-branded resources, and community impact tools. Visit our Partners page to get started.',
  },
  {
    question: 'Is Forward Focus Elevation really free?',
    answer:
      'Yes. All of our core services — AI coaching, the Reentry Navigator, Healing Hub tools, and Youth Futures programs — are completely free for participants. We are funded through grants, donations, and corporate sponsorships.',
  },
];

export const HomeFAQSection = () => {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <StructuredData data={faqSchema} />
      <section className="py-16 bg-muted/30">
        <div className="container px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 mb-4">
                <HelpCircle className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold uppercase tracking-wider text-primary">
                  Frequently Asked Questions
                </span>
              </div>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
                Common Questions About Our Services
              </h2>
            </div>
            <Accordion type="single" collapsible className="space-y-3">
              {FAQ_ITEMS.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`faq-${index}`}
                  className="bg-card border border-border rounded-lg px-6 data-[state=open]:shadow-md transition-shadow"
                >
                  <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>
    </>
  );
};
