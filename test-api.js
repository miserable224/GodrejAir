const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pkqgsoaekbeqtdbgerph.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fOozT1WkBnnbvTgH8bq13w_kdVyJIi9';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkApi() {
  console.log('Testing Supabase Connection...');

  try {
    const { data, error } = await supabase
      .from('water_records')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error fetching water_records:', error.message);
    } else {
      console.log('Successfully fetched from water_records. API is working.');
      console.log('Data:', data);
    }
    
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('assignments')
      .select('*')
      .limit(1);

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError.message);
    } else {
      console.log('Successfully fetched from assignments.');
      console.log('Data:', assignmentsData);
    }

  } catch (err) {
    console.error('Network or other error:', err);
  }
}

checkApi();
