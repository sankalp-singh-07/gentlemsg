import React from 'react';
import { useNavigate } from 'react-router-dom';

const FAQ = () => {
	const navigate = useNavigate();

	const faqs = [
		{
			question: 'How secure are my messages?',
			answer:
				'GentleMsg uses Google sign-in, JWT session tokens, and HTTPS/TLS in production. Messages are stored on the server (like most cloud messengers) and protected by authentication and access checks—not classic end-to-end encryption. Only people in the chat or group can load those messages through the API.',
		},
		{
			question: 'How do I find and add a friend?',
			answer:
				'Use the + button in the sidebar, or press ⌘K / Ctrl+K for global search. Search by name or username, then send a friend request.',
		},
		{
			question: 'How do I block or unblock a user?',
			answer:
				'Open a chat, click the menu (⋯) in the top right, and choose Block or Unblock.',
		},
		{
			question: 'How do I update my profile?',
			answer:
				'Open Settings → Profile. You can change your display name, username, and avatar. You can also export or delete your account (GDPR).',
		},
		{
			question: 'Can I send media files?',
			answer:
				'Yes. Use the attachment icon (or drag and drop) to send images, videos, and PDFs within size limits.',
		},
		{
			question: 'Can I make voice or video calls?',
			answer:
				'Yes—1:1 voice and video calls are available from the chat header (phone / camera icons). Grant microphone and camera permissions when prompted. Calls use WebRTC peer-to-peer media with signaling over WebSockets.',
		},
		{
			question: 'Does the app support group chat?',
			answer:
				'Yes. Open the Groups tab in the sidebar, create a group, add friends, and chat. Owners and admins can manage members.',
		},
		{
			question: 'Where do I see friend requests and notifications?',
			answer:
				'Use Settings for notifications and the Friends dialog for pending requests (accept, reject, or cancel sent requests).',
		},
		{
			question: 'What should I do if I find a bug?',
			answer:
				'Please report it via the Contact page so it can be fixed. Include steps to reproduce if you can.',
		},
	];

	return (
		<section className="bg-tertiary min-h-screen">
			<div className="flex flex-col justify-center p-4 mx-auto md:p-8 max-w-3xl">
				<h2 className="mb-12 text-black text-4xl font-bold leading-none text-center sm:text-5xl">
					FAQs
				</h2>
				<div className="flex flex-col divide-y dark:divide-zinc-600">
					{faqs.map((faq, index) => (
						<details key={index} className="group">
							<summary className="py-3 outline-none cursor-pointer focus:underline text-black font-medium text-left">
								{faq.question}
							</summary>
							<div className="px-1 pb-4 text-black/80 text-left text-sm leading-relaxed">
								<p>{faq.answer}</p>
							</div>
						</details>
					))}
				</div>
				<div className="text-center mt-16">
					<p className="text-black/70 text-sm mb-4">
						If issues persist, reach out through the contact form.
					</p>
					<div className="flex flex-wrap items-center justify-center gap-3">
						<button
							type="button"
							className="font-medium py-2.5 px-5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 shadow-sm"
							onClick={() => navigate('/contact-us')}
						>
							Contact Us
						</button>
						<button
							type="button"
							className="font-medium py-2.5 px-5 rounded-lg bg-primary text-white hover:opacity-90 shadow-sm"
							onClick={() => navigate('/admin')}
						>
							Back home
						</button>
					</div>
				</div>
			</div>
		</section>
	);
};

export default FAQ;
