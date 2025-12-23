#!/usr/bin/env tsx
/**
 * Cron script to retrieve open todo items and send email notifications
 * 
 * Usage:
 * - Development: npm run cron:send-reminders
 * - Direct: npx tsx jobs/sendReminders.ts
 * - Cron: Use the wrapper script: /path/to/project/jobs/run-send-reminders.sh
 * 
 * For cron, add to crontab (crontab -e):
 *   0 9 * * * /path/to/project/jobs/run-send-reminders.sh >> /path/to/logs/cron.log 2>&1
 * 
 * This will run daily at 9 AM. Adjust the schedule as needed.
 */

import { PrismaClient } from "../generated/prisma";
import nodemailer from "nodemailer";
import { toZonedTime } from "date-fns-tz";

const appName = "Lysje";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lysje.nvanwees.nl/";

// Set to true to bypass time/day checks and send to all users with settings (for testing)
const TEST_MODE = process.env.TEST_MODE === "true";

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

// Email configuration from environment variables
const getEmailTransporter = async () => {
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;

    if (!smtpUser || !smtpPassword) {
        throw new Error(
            "SMTP_USER and SMTP_PASSWORD environment variables are required for sending emails",
        );
    }

    console.log(`Configuring SMTP: ${smtpHost}:${smtpPort}, user: ${smtpUser}, from: ${smtpFrom}`);

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true for 465, false for other ports
        tls: {
            // do not fail on invalid certs
            rejectUnauthorized: false,
        },
        auth: {
            user: smtpUser,
            pass: smtpPassword,
        },
        debug: process.env.NODE_ENV === "development", // Enable debug output
        logger: process.env.NODE_ENV === "development", // Enable logging
    });

    // Verify connection and wait for it
    try {
        await transporter.verify();
        console.log("✓ SMTP server is ready to send messages");
    } catch (error) {
        console.error("✗ SMTP connection verification failed:", error);
        throw error;
    }

    return transporter;
};

// Generate HTML email content for a user's open todos
function generateEmailHTML(userName: string, todosByList: Array<{ list: { id: string; name: string; description: string | null }; items: Array<{ title: string; description: string | null; deadline: Date | null; createdAt: Date }> }>) {
    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { color: #2c3e50; }
        .list-section { margin: 20px 0; padding: 15px; background-color: #f8f9fa; }
        .list-name { font-size: 18px; font-weight: bold; color: #2c3e50; margin-bottom: 10px; }
        .todo-item { margin: 10px 0; padding: 10px; background-color: white; border-radius: 4px; }
        .todo-title { font-weight: bold; color: #2c3e50; }
        .todo-description { color: #666; margin-top: 5px; font-size: 14px; }
        .todo-deadline { color: #e74c3c; font-size: 12px; margin-top: 5px; }
        .todo-deadline.overdue { color: #c0392b; font-weight: bold; }
        .no-todos { color: #7f8c8d; font-style: italic; }
    </style>
</head>
<body>
    <div class="container">
        <h1><a href="${appUrl}">${appName}</a></h1>
        <p>Hi ${userName || "there"},</p>
        <p>Your open todo items:</p>
    `;

    if (todosByList.length === 0) {
        html += `<p class="no-todos">You have no open todo items. Great job!</p>`;
    } else {
        for (const { list, items } of todosByList) {
            html += `
        <div class="list-section">
            <div class="list-name"><a href="${appUrl}lists/${list.id}">${list.name}</a></div>
    `;

            if (items.length === 0) {
                html += `<p class="no-todos">No open items in this list.</p>`;
            } else {
                for (const item of items) {
                    html += `
            <div class="todo-item">
                <div class="todo-title">${escapeHtml(item.title)}</div>
                ${item.description ? `<div class="todo-description">${escapeHtml(item.description)}</div>` : ""}
                ${item.deadline ? (() => {
                            const deadlineDate = new Date(item.deadline);
                            const now = new Date();
                            const daysUntil = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                            const isOverdue = daysUntil < 0;
                            return `<div class="todo-deadline ${isOverdue ? "overdue" : ""}">Deadline: ${deadlineDate.toLocaleDateString()} ${isOverdue ? `(OVERDUE by ${Math.abs(daysUntil)} days)` : `(${daysUntil} days remaining)`}</div>`;
                        })() : ""}
            </div>
    `;
                }
            }

            html += `
        </div>
    `;
        }
    }

    html += `
        <p style="margin-top: 30px; color: #7f8c8d; font-size: 12px;">
            This is an automated email from Lysje.
        </p>
    </div>
</body>
</html>
    `;

    return html;
}

// Generate plain text email content
function generateEmailText(userName: string, todosByList: Array<{ list: { name: string; description: string | null }; items: Array<{ title: string; description: string | null; deadline: Date | null; createdAt: Date }> }>) {
    let text = `Your Open Todo Items\n\n`;
    text += `Hi ${userName || "there"},\n\n`;
    text += `Here's a summary of your open todo items:\n\n`;

    if (todosByList.length === 0) {
        text += `You have no open todo items. Great job!\n`;
    } else {
        for (const { list, items } of todosByList) {
            text += `${list.name}\n`;
            if (list.description) {
                text += `${list.description}\n`;
            }
            text += `${"=".repeat(list.name.length)}\n`;

            if (items.length === 0) {
                text += `  No open items in this list.\n\n`;
            } else {
                for (const item of items) {
                    text += `  - ${item.title}\n`;
                    if (item.description) {
                        text += `    ${item.description}\n`;
                    }
                    if (item.deadline) {
                        const deadlineDate = new Date(item.deadline);
                        const now = new Date();
                        const daysUntil = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        const isOverdue = daysUntil < 0;
                        text += `    Deadline: ${deadlineDate.toLocaleDateString()} ${isOverdue ? `(OVERDUE by ${Math.abs(daysUntil)} days)` : `(${daysUntil} days remaining)`}\n`;
                    }
                    text += `\n`;
                }
            }
            text += `\n`;
        }
    }

    return text;
}

// Escape HTML to prevent XSS
function escapeHtml(text: string) {
    const map: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m] || m);
}

/**
 * Check if it's time to send notification to a user based on their settings
 * @param notificationTime Time in HH:mm format (e.g., "09:00")
 * @param notificationDays Comma-separated days (0=Sunday, 1=Monday, etc.) e.g., "1,2,3,4,5"
 * @param timezone IANA timezone (e.g., "America/New_York")
 * @returns true if notification should be sent, false otherwise
 */
function shouldSendNotification(
    notificationTime: string | null,
    notificationDays: string | null,
    timezone: string | null,
): boolean {
    // If user hasn't configured settings, don't send
    if (!notificationTime || !notificationDays || !timezone) {
        return false;
    }

    try {
        // Get current time in UTC
        const nowUtc = new Date();

        // Convert to user's timezone
        const nowInUserTz = toZonedTime(nowUtc, timezone);

        // Get current day of week (0 = Sunday, 1 = Monday, etc.)
        const currentDay = nowInUserTz.getDay();

        // Parse notification days
        const days = notificationDays.split(",").map(Number);
        if (!days.includes(currentDay)) {
            return false; // Not a notification day
        }

        // Parse notification time
        const [hours, minutes] = notificationTime.split(":").map(Number);
        const notificationHour = hours ?? 9;
        const notificationMinute = minutes ?? 0;

        // Get current time in user's timezone
        const currentHour = nowInUserTz.getHours();
        const currentMinute = nowInUserTz.getMinutes();

        // Check if current time matches notification time (within 1 hour window)
        // This allows the cron job to run hourly and still catch the notification time
        const currentTimeInMinutes = currentHour * 60 + currentMinute;
        const notificationTimeInMinutes = notificationHour * 60 + notificationMinute;
        const timeDifference = Math.abs(currentTimeInMinutes - notificationTimeInMinutes);

        // Send if within 1 hour of notification time
        // This handles cases where cron runs at different times
        return timeDifference <= 60;
    } catch (error) {
        console.error(`Error checking notification time for timezone ${timezone}:`, error);
        return false;
    }
}

// Send email to a user
async function sendEmailToUser(
    userEmail: string,
    userName: string,
    todosByList: Array<{ list: { id: string; name: string; description: string | null }; items: Array<{ title: string; description: string | null; deadline: Date | null; createdAt: Date }> }>,
    transporter: nodemailer.Transporter,
) {
    const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@example.com";

    try {
        console.log(`Attempting to send email to ${userEmail} from ${smtpFrom}...`);

        const info = await transporter.sendMail({
            from: smtpFrom,
            to: userEmail,
            subject: "Your Open Todo Items",
            text: generateEmailText(userName, todosByList),
            html: generateEmailHTML(userName, todosByList),
            // Add headers to improve deliverability
            headers: {
                "X-Priority": "3",
                "X-MSMail-Priority": "Normal",
                "Importance": "normal",
                "List-Unsubscribe": `<${appUrl}settings>`,
            },
            // Add reply-to for better deliverability
            replyTo: smtpFrom,
        });

        console.log(`✓ Email sent successfully to ${userEmail}`);
        console.log(`  Message ID: ${info.messageId}`);
        console.log(`  Response: ${info.response}`);

        // Verify the email was actually accepted
        if (info.accepted && info.accepted.length > 0) {
            console.log(`  Accepted by server for: ${info.accepted.join(", ")}`);
        }
        if (info.rejected && info.rejected.length > 0) {
            console.error(`  Rejected by server: ${info.rejected.join(", ")}`);
            return false;
        }
        if (info.pending && info.pending.length > 0) {
            console.warn(`  Pending: ${info.pending.join(", ")}`);
        }

        return true;
    } catch (error) {
        console.error(`✗ Failed to send email to ${userEmail}:`, error);
        if (error instanceof Error) {
            console.error(`  Error message: ${error.message}`);
            console.error(`  Error stack: ${error.stack}`);
        }
        return false;
    }
}

async function getOpenTodos() {
    try {
        console.log("Fetching users with their open todo items...\n");
        console.log(`Current server time: ${new Date().toISOString()}\n`);

        // Create transporter once and verify connection
        console.log("Initializing email transporter...");
        const transporter = await getEmailTransporter();

        // Get all users with their todo lists and only open items
        const users = await prisma.user.findMany({
            include: {
                todoLists: {
                    include: {
                        items: {
                            where: {
                                done: false, // Only get open todos
                            },
                            orderBy: [
                                { deadline: "asc" },
                                { createdAt: "asc" },
                            ],
                        },
                    },
                },
            },
        });

        console.log(`Found ${users.length} user(s) in database\n`);

        let emailsSent = 0;
        let emailsFailed = 0;
        let skippedNoSettings = 0;
        let skippedTime = 0;
        let skippedNoTodos = 0;

        for (const user of users) {
            // Check if user has notification settings configured
            if (!user.notificationTime || !user.notificationDays || !user.timezone) {
                console.log(`⊘ Skipping ${user.email} - notification settings not configured (time: ${user.notificationTime ?? "null"}, days: ${user.notificationDays ?? "null"}, timezone: ${user.timezone ?? "null"})`);
                skippedNoSettings++;
                continue;
            }

            // Check if it's time to send notification based on user's timezone and preferences
            // In test mode, skip the time check
            const shouldSend = TEST_MODE || shouldSendNotification(
                user.notificationTime,
                user.notificationDays,
                user.timezone,
            );

            if (!shouldSend && !TEST_MODE) {
                const nowInUserTz = toZonedTime(new Date(), user.timezone);
                const currentDay = nowInUserTz.getDay();
                const days = user.notificationDays.split(",").map(Number);
                const [hours, minutes] = user.notificationTime.split(":").map(Number);
                const currentHour = nowInUserTz.getHours();
                const currentMinute = nowInUserTz.getMinutes();
                const currentTimeInMinutes = currentHour * 60 + currentMinute;
                const notificationTimeInMinutes = (hours ?? 9) * 60 + (minutes ?? 0);
                const timeDifference = Math.abs(currentTimeInMinutes - notificationTimeInMinutes);

                console.log(
                    `⊘ Skipping ${user.email} - not the right time/day\n` +
                    `  Current: ${nowInUserTz.toLocaleString("en-US", { timeZone: user.timezone })} (day ${currentDay}) in ${user.timezone}\n` +
                    `  Configured: ${user.notificationTime} on days [${days.join(",")}]\n` +
                    `  Time difference: ${timeDifference} minutes (needs to be ≤ 60 minutes)`,
                );
                skippedTime++;
                continue;
            }

            // Group todos by list and filter out lists with no open items
            const todosByList = user.todoLists
                .map((list) => ({
                    list: {
                        id: list.id,
                        name: list.name,
                        description: list.description,
                    },
                    items: list.items,
                }))
                .filter(({ items }) => items.length > 0); // Only include lists with open items

            // Skip users with no open todos
            if (todosByList.length === 0) {
                console.log(`⊘ Skipping ${user.email} - no open todos`);
                skippedNoTodos++;
                continue;
            }

            // Count total open todos for logging
            const totalOpenTodos = todosByList.reduce((sum, { items }) => sum + items.length, 0);
            const nowInUserTz = toZonedTime(new Date(), user.timezone);
            console.log(
                `📧 Sending email to ${user.email} (${totalOpenTodos} open todo(s) across ${todosByList.length} list(s)) at ${nowInUserTz.toLocaleString("en-US", { timeZone: user.timezone })} in ${user.timezone}`,
            );

            const success = await sendEmailToUser(user.email, user.name, todosByList, transporter);
            if (success) {
                emailsSent++;
            } else {
                emailsFailed++;
            }
        }

        console.log(`\n✅ Summary:`);
        console.log(`   📧 Emails sent: ${emailsSent}`);
        console.log(`   ✗ Failed: ${emailsFailed}`);
        console.log(`   ⊘ Skipped (no settings): ${skippedNoSettings}`);
        console.log(`   ⊘ Skipped (wrong time/day): ${skippedTime}`);
        console.log(`   ⊘ Skipped (no open todos): ${skippedNoTodos}`);
    } catch (error) {
        console.error("Error fetching open todos:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
getOpenTodos()
    .then(() => {
        console.log("Script completed successfully.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Script failed:", error);
        process.exit(1);
    });

