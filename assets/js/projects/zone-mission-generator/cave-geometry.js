export function tunnelPolygon(tunnel) {
  const a = tunnel.fromPosition, b = tunnel.toPosition;
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  if (!length) return [];
  const x = (a.z - b.z) * tunnel.width / (2 * length);
  const z = (b.x - a.x) * tunnel.width / (2 * length);
  return [
    { x: a.x + x, z: a.z + z }, { x: b.x + x, z: b.z + z },
    { x: b.x - x, z: b.z - z }, { x: a.x - x, z: a.z - z },
  ];
}

export function insidePolygon(p, vertices) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[i], b = vertices[j];
    if ((a.z > p.z) !== (b.z > p.z) && p.x < (b.x - a.x) * (p.z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

const cross = (ax, az, bx, bz) => ax * bz - az * bx;

// Cut away any portions of chamber or tunnel walls covered by another walkable surface.
export function caveBoundary(segment) {
  const polygons = [...segment.rooms.map(room => room.polygon), ...segment.tunnels.map(tunnel => tunnelPolygon(tunnel).reverse())]
    .filter(vertices => vertices.length >= 3)
    .map(vertices => ({
      vertices,
      minX: Math.min(...vertices.map(p => p.x)), maxX: Math.max(...vertices.map(p => p.x)),
      minZ: Math.min(...vertices.map(p => p.z)), maxZ: Math.max(...vertices.map(p => p.z)),
    }));
  const walls = [];
  for (const polygon of polygons) {
    for (let i = 0; i < polygon.vertices.length; i++) {
      const a = polygon.vertices[i], b = polygon.vertices[(i + 1) % polygon.vertices.length];
      const dx = b.x - a.x, dz = b.z - a.z;
      const at = t => ({ x: a.x + t * dx, z: a.z + t * dz });
      const nearby = polygons.filter(other => other !== polygon &&
        other.minX <= Math.max(a.x, b.x) && other.maxX >= Math.min(a.x, b.x) &&
        other.minZ <= Math.max(a.z, b.z) && other.maxZ >= Math.min(a.z, b.z));
      const cuts = [0, 1];
      for (const { vertices } of nearby) {
        for (let j = 0; j < vertices.length; j++) {
          const c = vertices[j], d = vertices[(j + 1) % vertices.length];
          const ex = d.x - c.x, ez = d.z - c.z;
          const det = cross(dx, dz, ex, ez);
          if (Math.abs(det) < 1e-9) continue;
          const t = cross(c.x - a.x, c.z - a.z, ex, ez) / det;
          const u = cross(c.x - a.x, c.z - a.z, dx, dz) / det;
          if (t > 0 && t < 1 && u >= 0 && u <= 1) cuts.push(t);
        }
      }
      cuts.sort((a, b) => a - b);
      for (let j = 1; j < cuts.length; j++) {
        const lo = cuts[j - 1], hi = cuts[j];
        if ((hi - lo) * Math.hypot(dx, dz) < .005) continue;
        if (!nearby.some(other => insidePolygon(at((lo + hi) / 2), other.vertices))) walls.push([at(lo), at(hi)]);
      }
    }
  }
  return walls;
}
