function run() {
  console.log("hello");
  setTimeout(run, 1000);   // reprogramme l’appel dans 1 s
}

setTimeout(run, 1000);     // lance la boucle 
