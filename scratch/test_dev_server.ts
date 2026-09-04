async function main() {
  try {
    const res = await fetch('http://localhost:3000/api/repositories');
    console.log('Status:', res.status);
    const json = await res.json();
    console.log('Repositories count:', json.repositories?.length);
    console.log('First repo:', json.repositories?.[0]?.name, json.repositories?.[0]?.id);
  } catch (err: any) {
    console.error('Fetch error:', err.message);
  }
}

main();
