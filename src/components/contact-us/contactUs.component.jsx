import React, { useState } from 'react';

const ContactUs = () => {
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		message: '',
	});

	const handleInputChange = (e) => {
		const { id, value } = e.target;
		setFormData((prevData) => ({
			...prevData,
			[id]: value,
		}));
	};

	const handleSubmit = async (e) => {
		e.preventDefault(); // Prevent default form submission

		try {
			const response = await fetch('https://formspree.io/f/myzzelej', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(formData),
			});

			if (response.ok) {
				alert('Message sent successfully!');
				window.location.href = '/'; // Redirect to the home page
			} else {
				throw new Error('Form submission failed');
			}
		} catch (error) {
			alert('There was an error sending your message. Please try again.');
			console.error('Error:', error);
		}
	};

	return (
		<div className="bg-tertiary h-screen w-screen flex items-center justify-center">
			<div className="container mx-auto py-12">
				<div className="max-w-lg mx-auto px-4">
					<h2 className="text-4xl font-bold text-black mb-7">
						Have Questions? Let's Get in Touch!
					</h2>
					<form
						onSubmit={handleSubmit}
						className="bg-white rounded-lg px-6 py-8 shadow-md"
					>
						<div className="mb-4">
							<label className="block text-start text-zinc-950 font-medium mb-2">
								Name
							</label>
							<input
								className="appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-1 focus:outline-primary"
								id="name"
								name="name"
								type="text"
								placeholder="Enter your name"
								value={formData.name}
								onChange={handleInputChange}
								required
							/>
						</div>

						<div className="mb-4">
							<label className="block text-start text-zinc-950 font-medium mb-2">
								Email
							</label>
							<input
								className="appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-1 focus:outline-primary"
								id="email"
								name="email"
								type="email"
								placeholder="Enter your email"
								value={formData.email}
								onChange={handleInputChange}
								required
							/>
						</div>

						<div className="mb-4">
							<label className="block text-start text-zinc-950 font-medium mb-2">
								Message
							</label>
							<textarea
								className="appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-1 focus:outline-primary"
								id="message"
								name="message"
								rows="6"
								placeholder="Enter your message"
								value={formData.message}
								onChange={handleInputChange}
								required
							></textarea>
						</div>

						<div className="flex justify-end gap-4">
							<div className="flex">
								<button
									className="bg-zinc-950 hover:bg-primary text-white  font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
									type="submit"
								>
									Send
								</button>
							</div>
							<div className="flex">
								<button
									className="bg-gray-100 border-2 border-primary hover:bg-primary text-zinc-950 font-bold py-2 px-4 rounded hover:text-white focus:outline-none focus:shadow-outline"
									type="button"
									onClick={() => (window.location.href = '/')}
								>
									Go Back 🏠
								</button>
							</div>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
};

export default ContactUs;
