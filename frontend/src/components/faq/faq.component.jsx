import React from 'react';
import { useNavigate } from 'react-router-dom';

const FAQ = () => {
	const navigate = useNavigate();

	const faqs = [
		{
			question: 'How secure are my messages?',
			answer: 'Your messages are encrypted end-to-end, ensuring that only you and the recipient can read them. No one else, not even developer, can access your messages.',
		},
		{
			question: 'How to search for a friend?',
			answer: 'Click on the "+" icon in the sidebar section. You need to know the username of the person you are looking for.',
		},
		{
			question: 'How do I block or unblock a user?',
			answer: 'Go to specific user, click on the menu icon on the top right corner, and select block or unblock.',
		},
		{
			question: 'How to update my profile details',
			answer: 'Hit the seetings icon, then click on profile. You can update your profile details there.',
		},
		{
			question: 'Can I send media files and documents?',
			answer: 'Absolutely! Use the attachment icon in the chat input bar to send photos, videos, and other files to your contacts.',
		},
		{
			question: 'What should I do if I encounter a bug or issue?',
			answer: 'If you were to encounter a bug or issue, please report it to us immediately so we can fix it. You can reach out to us through the contact form. Just hit the button below.',
		},
		{
			question: 'Can I make voice or video calls through the app?',
			answer: 'Sorry we do not have voice or video call functionality at the moment. We are working on it and it will be available soon.',
		},
		{
			question: 'Does the app have group chat functionality?',
			answer: 'Sorry, we do not have group chat functionality at the moment. We are working on it and it will be available soon.',
		},
		{
			question:
				'How to check my account activity like who send me requests?',
			answer: 'You can do so by clicking settings icon, then click on notifications for all the activities. You can check requests section to accept or delete the requests.',
		},
	];

	return (
		<section className="bg-tertiary">
			<div className="flex flex-col justify-center p-4 mx-auto md:p-8">
				<h2 className="mb-20 text-black text-4xl font-bold leading-none text-center sm:text-5xl">
					FAQs
				</h2>
				<div className="flex flex-col divide-y sm:px-8 lg:px-12 xl:px-32 dark:divide-zinc-500">
					{faqs.map((faq, index) => (
						<details key={index}>
							<summary className="py-2 outline-none cursor-pointer focus:underline text-black">
								{faq.question}
							</summary>
							<div className="px-4 pb-4 text-black">
								<p>{faq.answer}</p>
							</div>
						</details>
					))}
				</div>
				<div className="text-center mt-20">
					<p className="text-black">
						If your issues persist, please don't hesitate to reach
						out to us for further assistance.
					</p>
					<button
						className="bg-black dark:bg-zinc-950 text-white  font-medium py-2 px-4 mt-3 rounded-md mx-2"
						onClick={() => navigate('/contact-us')}
					>
						Contact Us
					</button>
					<button
						className="bg-primary  text-white py-2 px-4 mt-3 rounded-md mx-2"
						onClick={() => navigate('/admin')}
					>
						Back to 🏠
					</button>
				</div>
			</div>
		</section>
	);
};

export default FAQ;
