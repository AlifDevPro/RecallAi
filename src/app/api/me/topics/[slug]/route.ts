import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import { validateRoadmap, validateTopicName } from "@/lib/topics/validate-topic";



async function getTopicForUser(

  supabase: Awaited<ReturnType<typeof createClient>>,

  userId: string,

  slug: string

) {

  const { data: topic, error } = await supabase

    .from("topics")

    .select("id, name, slug, status, roadmap")

    .eq("user_id", userId)

    .eq("slug", slug)

    .single();



  if (error || !topic) return null;

  return topic;

}



export async function GET(

  _request: Request,

  { params }: { params: Promise<{ slug: string }> }

) {

  const { slug } = await params;

  const supabase = await createClient();

  const {

    data: { user },

  } = await supabase.auth.getUser();



  if (!user) {

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  }



  const topic = await getTopicForUser(supabase, user.id, slug);

  if (!topic) {

    return NextResponse.json({ error: "Not found" }, { status: 404 });

  }



  const { data: cards, error: cardsError } = await supabase

    .from("cards")

    .select("id, front, back, topic_id")

    .eq("topic_id", topic.id)

    .eq("user_id", user.id);



  if (cardsError) {

    return NextResponse.json({ error: cardsError.message }, { status: 500 });

  }



  const cardIds = (cards ?? []).map((c) => c.id);

  const now = new Date().toISOString();



  let scheduling: {

    card_id: string;

    due_at: string;

    mastery: number;

    mastery_7d_ago: number | null;

    last_reviewed_at: string | null;

  }[] = [];



  if (cardIds.length > 0) {

    const { data, error: schedError } = await supabase

      .from("card_scheduling")

      .select("card_id, due_at, mastery, mastery_7d_ago, last_reviewed_at")

      .eq("user_id", user.id)

      .in("card_id", cardIds);



    if (schedError) {

      return NextResponse.json({ error: schedError.message }, { status: 500 });

    }



    scheduling = (data ?? []).map((s) => ({

      ...s,

      mastery: Number(s.mastery),

      mastery_7d_ago: s.mastery_7d_ago != null ? Number(s.mastery_7d_ago) : null,

    }));

  }



  const schedMap = new Map(scheduling.map((s) => [s.card_id, s]));



  const cardRows = (cards ?? []).map((c) => {

    const s = schedMap.get(c.id);

    return {

      id: c.id,

      front: c.front,

      back: c.back,

      retention: s ? Math.round(Number(s.mastery)) : 0,

      due: s ? s.due_at <= now : false,

      lastReviewed: s?.last_reviewed_at

        ? formatRelative(s.last_reviewed_at)

        : "Never",

      nextReview: s?.due_at ? formatRelativeFuture(s.due_at) : "—",

      mastery7dAgo: s?.mastery_7d_ago ?? null,

    };

  });



  const mastery =

    cardRows.length > 0

      ? Math.round(cardRows.reduce((sum, c) => sum + c.retention, 0) / cardRows.length)

      : 0;

  const due = cardRows.filter((c) => c.due).length;



  const roadmap = validateRoadmap(topic.roadmap ?? []);



  return NextResponse.json({

    topic: {

      id: topic.slug,

      name: topic.name,

      slug: topic.slug,

      status: topic.status,

      mastery,

      due,

      cards: cardRows,

      roadmap,

    },

  });

}



export async function PATCH(

  request: Request,

  { params }: { params: Promise<{ slug: string }> }

) {

  const { slug } = await params;

  const supabase = await createClient();

  const {

    data: { user },

  } = await supabase.auth.getUser();



  if (!user) {

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  }



  const topic = await getTopicForUser(supabase, user.id, slug);

  if (!topic) {

    return NextResponse.json({ error: "Not found" }, { status: 404 });

  }



  const body = await request.json();

  const updates: Record<string, unknown> = {};



  if (typeof body.name === "string" && body.name.trim()) {

    const nameError = validateTopicName(body.name);

    if (nameError) {

      return NextResponse.json({ error: nameError }, { status: 400 });

    }

    updates.name = body.name.trim();

  }

  if (body.status === "active" || body.status === "archived") {

    updates.status = body.status;

  }

  if (body.roadmap !== undefined) {

    updates.roadmap = validateRoadmap(body.roadmap);

  }



  if (Object.keys(updates).length === 0) {

    return NextResponse.json({ error: "No valid fields" }, { status: 400 });

  }



  const { error } = await supabase.from("topics").update(updates).eq("id", topic.id);

  if (error) {

    return NextResponse.json({ error: error.message }, { status: 500 });

  }



  return NextResponse.json({ ok: true, roadmap: updates.roadmap });

}



export async function DELETE(

  _request: Request,

  { params }: { params: Promise<{ slug: string }> }

) {

  const { slug } = await params;

  const supabase = await createClient();

  const {

    data: { user },

  } = await supabase.auth.getUser();



  if (!user) {

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  }



  const topic = await getTopicForUser(supabase, user.id, slug);

  if (!topic) {

    return NextResponse.json({ error: "Not found" }, { status: 404 });

  }



  const { error } = await supabase.from("topics").delete().eq("id", topic.id);

  if (error) {

    return NextResponse.json({ error: error.message }, { status: 500 });

  }



  return NextResponse.json({ ok: true });

}



function formatRelative(iso: string): string {

  const diff = Date.now() - new Date(iso).getTime();

  const days = Math.floor(diff / 86400000);

  if (days === 0) return "Today";

  if (days === 1) return "1 day ago";

  return `${days} days ago`;

}



function formatRelativeFuture(iso: string): string {

  const diff = new Date(iso).getTime() - Date.now();

  const days = Math.ceil(diff / 86400000);

  if (days <= 0) return "Today";

  if (days === 1) return "1 day";

  return `${days} days`;

}


