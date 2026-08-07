export async function notifyBuildEvent(input: {
  projectName: string;
  version: string;
  status: string;
  environment: string;
  message?: string;
}) {
  const slackUrl = process.env.SLACK_WEBHOOK_URL;
  const discordUrl = process.env.DISCORD_WEBHOOK_URL;

  const text = `[${input.projectName}] ${input.version} (${input.environment}) — ${input.status}${input.message ? `: ${input.message}` : ""}`;

  const payloads = [
    slackUrl
      ? fetch(slackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        }).catch(() => undefined)
      : null,
    discordUrl
      ? fetch(discordUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text }),
        }).catch(() => undefined)
      : null,
  ];

  await Promise.all(payloads.filter(Boolean));
}
