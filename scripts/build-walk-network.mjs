import fs from 'node:fs/promises';
const w=JSON.parse(await fs.readFile('realism/world-v2.json','utf8'));
const region=[126.517,33.508,126.536,33.522];const inside=p=>p[0]>=region[0]&&p[0]<=region[2]&&p[1]>=region[1]&&p[1]<=region[3];
const paths=w.roads.filter(r=>['footway','pedestrian'].includes(r.highway)&&r.walkable===true&&!r.bridge&&!r.tunnel&&Number(r.layer||0)===0&&r.coords.some(inside)).map(r=>({id:r.id,highway:r.highway,coords:r.coords,bridge:false,tunnel:false,layer:0}));
const buildings=w.buildings.filter(r=>r.coords?.some(p=>p[0]>=region[0]-.001&&p[0]<=region[2]+.001&&p[1]>=region[1]-.001&&p[1]<=region[3]+.001)).map(r=>r.coords);
await fs.writeFile('precision/walk-network.json',JSON.stringify({schema:1,source:'Historical OSM snapshot, not provider geometry',capturedAt:w.capturedAt,license:'ODbL-1.0',attribution:'© OpenStreetMap contributors',sourceUrl:'https://www.openstreetmap.org/copyright',region,paths,buildings,airportWalkingEnabled:false,accessPermissionVerified:false,entrancesVerified:false,physicalSafetyVerified:false,note:'Access tags were not retained. Oldtown experiment only; no airport, bridge, tunnel or vehicle roads.'}));
console.log(JSON.stringify({walkPaths:paths.length,blockingFootprints:buildings.length,airportWalkingEnabled:false,accessPermissionVerified:false}));
