// test parse langsung
const fs = require("fs");

// Simulasi raw dari response yang berhasil (curl hai)
const raw = `)]}'

177
[["wrb.fr",null,"[null,[\\"c_85eae75d9deb0343\\",\\"r_1bab7ad697720072\\"],null,null,[[\\"rc_e03b3740cb7dac9b\\",[\\"Hai again! \\\\n\\\\nWhat's on your mind today? Let me know how I can help!\\"],null,null,null,null,null,null,[2],null,null,null,[null,null,null,null,null,null,null,[]],null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,[],null,null,null,null,null,null,null,null,[]]]"]]`;

for (const line of raw.split("\n")) {
  console.log(`cc0=${line.charCodeAt(0)} len=${line.length} : ${line.slice(0,60)}`);
  if (line.charCodeAt(0) !== 91) continue;
  try {
    const p = JSON.parse(line);
    console.log("PARSED OK, items:", p.length);
    for (const item of p) {
      console.log("  item[0]:", item[0]);
    }
  } catch(e) {
    console.log("PARSE FAIL:", e.message);
  }
}
