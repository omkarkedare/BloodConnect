import { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/forms/Input';
import Textarea from '../../components/forms/Textarea';
import Card from '../../components/ui/Card';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold text-surface-900 mb-4">Contact Us</h1>
        <p className="text-surface-500 max-w-2xl mx-auto text-lg">Have questions? We'd love to hear from you.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          {[
            { icon: Mail, label: 'Email', value: 'info@bloodconnect.com' },
            { icon: Phone, label: 'Phone', value: '+92 300 1234567' },
            { icon: MapPin, label: 'Address', value: 'Islamabad, Pakistan' },
          ].map(({ icon: Icon, label, value }) => (
            <Card key={label}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-surface-500">{label}</p>
                  <p className="font-medium text-surface-800">{value}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div className="lg:col-span-2">
          <Card>
            <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input label="Full Name" name="name" value={form.name} onChange={handleChange} placeholder="Your name" />
                <Input label="Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" />
              </div>
              <Input label="Subject" name="subject" value={form.subject} onChange={handleChange} placeholder="How can we help?" />
              <Textarea label="Message" name="message" value={form.message} onChange={handleChange} placeholder="Write your message..." rows={5} />
              <Button type="submit" icon={Send}>Send Message</Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
