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
const appUrl = "http://y40gocgwg4oww80go8gcggo8.46.224.121.159.sslip.io/";

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

// Email configuration from environment variables
const getEmailTransporter = () => {
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

    return nodemailer.createTransport({
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
    });
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
            <div class="list-name"><a href="${appUrl}/lists/${list.id}">${list.name}</a></div>
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
) {
    const transporter = getEmailTransporter();
    const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@example.com";

    try {
        await transporter.sendMail({
            from: smtpFrom,
            to: userEmail,
            subject: "Your Open Todo Items",
            text: generateEmailText(userName, todosByList),
            html: generateEmailHTML(userName, todosByList),
        });
        console.log(`✓ Email sent successfully to ${userEmail}`);
        return true;
    } catch (error) {
        console.error(`✗ Failed to send email to ${userEmail}:`, error);
        return false;
    }
}

async function getOpenTodos() {
    try {
        console.log("Fetching users with their open todo items...\n");

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

        let emailsSent = 0;
        let emailsFailed = 0;

        for (const user of users) {
            // Check if user has notification settings configured
            if (!user.notificationTime || !user.notificationDays || !user.timezone) {
                console.log(`⊘ Skipping ${user.email} - notification settings not configured`);
                continue;
            }

            // Check if it's time to send notification based on user's timezone and preferences
            if (
                !shouldSendNotification(
                    user.notificationTime,
                    user.notificationDays,
                    user.timezone,
                )
            ) {
                const nowInUserTz = toZonedTime(new Date(), user.timezone);
                const currentDay = nowInUserTz.getDay();
                const days = user.notificationDays.split(",").map(Number);
                console.log(
                    `⊘ Skipping ${user.email} - not the right time/day (current: ${nowInUserTz.toLocaleString("en-US", { timeZone: user.timezone })} in ${user.timezone}, configured: ${user.notificationTime} on days [${days.join(",")}])`,
                );
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
                continue;
            }

            // Count total open todos for logging
            const totalOpenTodos = todosByList.reduce((sum, { items }) => sum + items.length, 0);
            const nowInUserTz = toZonedTime(new Date(), user.timezone);
            console.log(
                `📧 Sending email to ${user.email} (${totalOpenTodos} open todo(s) across ${todosByList.length} list(s)) at ${nowInUserTz.toLocaleString("en-US", { timeZone: user.timezone })} in ${user.timezone}`,
            );

            const success = await sendEmailToUser(user.email, user.name, todosByList);
            if (success) {
                emailsSent++;
            } else {
                emailsFailed++;
            }
        }

        console.log(`\n✅ Summary: ${emailsSent} email(s) sent, ${emailsFailed} failed`);
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

