const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ikukbfzuhssyefnukmpb.supabase.co',
  'sb_publishable_n81hAAjsZ-EzXVutndqTkw_oQu6m9Oa'
);

async function test() {
  console.log("=== Testing Database ===");
  const { data: users, error: errU } = await supabase.from('users').select('*');
  console.log("Users count:", users ? users.length : null, "Error:", errU);
  if (users) console.log("Users sample:", users.slice(0, 3));

  const { data: posts, error: errP } = await supabase.from('posts').select('*');
  console.log("Posts count:", posts ? posts.length : null, "Error:", errP);
  if (posts) console.log("Posts sample:", posts.slice(0, 3));

  const { data: comments, error: errC } = await supabase.from('comments').select('*');
  console.log("Comments count:", comments ? comments.length : null, "Error:", errC);

  const { data: likes, error: errL } = await supabase.from('likes').select('*');
  console.log("Likes count:", likes ? likes.length : null, "Error:", errL);
}

test();
