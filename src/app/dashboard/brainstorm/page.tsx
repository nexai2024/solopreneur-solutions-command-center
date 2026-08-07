import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IdeaWorkspace } from "@/components/ideas/idea-workspace";
import { BrainstormCanvasWorkspace } from "@/components/brainstorm/brainstorm-canvas-workspace";
import { getIdeasForUser } from "@/lib/actions/ideas";
import { getBrainstormSessions } from "@/lib/actions/brainstorm";

export const dynamic = "force-dynamic";

export default async function BrainstormPage() {
  const [ideas, sessions] = await Promise.all([
    getIdeasForUser(),
    getBrainstormSessions(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Brainstorm & Idea Scorer</h1>
        <p className="text-muted-foreground">
          Capture product ideas, score them with AI, or explore ideas on an
          interactive canvas. Promote winners to projects when ready to build.
        </p>
      </div>

      <Tabs defaultValue="scorer">
        <TabsList>
          <TabsTrigger value="scorer">Idea Scorer</TabsTrigger>
          <TabsTrigger value="canvas">Canvas</TabsTrigger>
        </TabsList>
        <TabsContent value="scorer" className="mt-6">
          <IdeaWorkspace initialIdeas={ideas} />
        </TabsContent>
        <TabsContent value="canvas" className="mt-6">
          <BrainstormCanvasWorkspace initialSessions={sessions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
