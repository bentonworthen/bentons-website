import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// This function handles POST requests to /api/contact
export async function POST(request: NextRequest) {
  try {
    // Extract the form data from the request body
    // This gives us an object with name, email, phone, and message
    const { name, email, phone, message } = await request.json();

    // Validate that required fields are present
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Print a separator line for better readability
    console.log('\n' + '='.repeat(50));
    console.log('📬 NEW CONTACT FORM SUBMISSION');
    console.log('='.repeat(50));

    // Print each field in a formatted way
    console.log(`📝 Name:    ${name}`);
    console.log(`📧 Email:   ${email}`);

    // Only print phone if it was provided (it's optional)
    if (phone) {
      console.log(`📞 Phone:   ${phone}`);
    }

    console.log(`💬 Message:\n${message}`);
    console.log('='.repeat(50) + '\n');

    // Configure nodemailer transporter for Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Email content to send to you
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: `New Contact Form Submission from ${name}`,
      text: `
New contact form submission:

Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}

Message:
${message}
      `,
      html: `
<h2>New Contact Form Submission</h2>
<p><strong>Name:</strong> ${name}</p>
<p><strong>Email:</strong> ${email}</p>
<p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
<h3>Message:</h3>
<p>${message.replace(/\n/g, '<br>')}</p>
      `,
      replyTo: email, // Set reply-to as the sender's email
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully');

    // Send a success response back to the frontend
    // This is what makes the form show "Message sent successfully!"
    return NextResponse.json(
      { message: 'Message sent successfully!' },
      { status: 200 }
    );
  } catch (error) {
    // If something goes wrong, log the error and send an error response
    console.error('❌ Error processing form submission:', error);
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 }
    );
  }
}
