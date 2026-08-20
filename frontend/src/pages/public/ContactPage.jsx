import { useState } from 'react';
import { Mail, Phone, MapPin, Send, User, HelpCircle, MessageSquare } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/forms/Input';
import Textarea from '../../components/forms/Textarea';
import Card from '../../components/ui/Card';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="bg-surface-50 min-h-screen py-16">
      <div className="global-container">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-surface-900 mb-4">Contact Us</h1>
          <p className="text-surface-500 max-w-2xl mx-auto text-lg">Have questions? We'd love to hear from you.</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Left Column: Contact Information */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-surface-900 mb-6">Contact Information</h2>
            {[
              { icon: MapPin, label: 'Location', value: 'Chhatrapati Sambhajinagar, Maharashtra, India' },
              { icon: Phone, label: 'Phone', value: '8975xxxxxx' },
            ].map(({ icon: Icon, label, value }) => (
              <Card key={label} className="p-6">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-7 h-7 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-surface-500 uppercase tracking-wide">{label}</p>
                    <p className="text-lg font-medium text-surface-900 mt-1">{value}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Right Column: Contact Form */}
          <Card header="Send Us a Message">
            <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 gap-5">
                <Input 
                  label="Name" 
                  name="name" 
                  icon={User}
                  value={form.name} 
                  onChange={handleChange} 
                  placeholder="Enter your name" 
                />
                <Input 
                  label="Email" 
                  name="email" 
                  type="email" 
                  icon={Mail}
                  value={form.email} 
                  onChange={handleChange} 
                  placeholder="Enter your email" 
                />
                <Input 
                  label="Subject" 
                  name="subject" 
                  icon={HelpCircle}
                  value={form.subject} 
                  onChange={handleChange} 
                  placeholder="Enter subject" 
                />
                <Textarea 
                  label="Message" 
                  name="message" 
                  value={form.message} 
                  onChange={handleChange} 
                  placeholder="Enter your message" 
                  rows={5} 
                />
              </div>
              <Button type="submit" className="w-full py-3 text-base" icon={Send}>
                Send Message
              </Button>
            </form>
          </Card>
          
        </div>
      </div>
    </div>
  );
}
