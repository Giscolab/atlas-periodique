/**
 * Fit an axis-aligned world-space box into a viewport rectangle.
 * World axes: +X right, +Y up, +Z toward the viewer. The camera looks down -Z
 * with +Y up; position and target share X/Y, so no tilt or model flattening is
 * introduced. `fov` is vertical degrees. Frame edges are normalized viewport
 * coordinates measured from its top-left corner.
 *
 * The fit considers both Z faces, including frames entirely on one side of
 * the optical axis. It returns the minimum front-facing distance that fits,
 * and centers the camera within the remaining feasible X/Y intervals.
 * `distance` is measured from position to target (the box's middle Z plane).
 */
export function fitFrontCamera(box, options = {}) {
  const { aspect, fov = 28, frame = { left: 0, right: 1, top: 0, bottom: 1 } } = options;
  if (!box || ![box.min, box.max].every(value =>
    Array.isArray(value) && value.length === 3 && value.every(Number.isFinite))) {
    throw new TypeError('Box min/max must contain three finite coordinates.');
  }
  if (box.min.some((value, axis) => value > box.max[axis])) {
    throw new RangeError('Box min must not exceed max.');
  }
  if (!Number.isFinite(aspect) || aspect <= 0 ||
      !Number.isFinite(fov) || fov <= 0 || fov >= 180) {
    throw new RangeError('Aspect must be positive and FOV must lie between 0 and 180 degrees.');
  }
  if (!frame || !['left', 'right', 'top', 'bottom'].every(key =>
    Number.isFinite(frame[key]) && frame[key] >= 0 && frame[key] <= 1) ||
      frame.left >= frame.right || frame.top >= frame.bottom) {
    throw new RangeError('Frame must be a nonempty rectangle inside the viewport.');
  }

  const size = box.max.map((value, axis) => value - box.min[axis]);
  const depth = size[2];
  const tanY = Math.tan(fov * Math.PI / 360);
  const tanX = tanY * aspect;
  const left = 2 * frame.left - 1;
  const right = 2 * frame.right - 1;
  const bottom = 1 - 2 * frame.bottom;
  const top = 1 - 2 * frame.top;

  // D is the distance from the camera to the nearest (+Z) face. At any
  // vertex: low*tan*(D + maxZ-z) <= coordinate-camera <= high*tan*(...).
  // Intersect these inequalities for both Z faces. The feasible interval for
  // camera X/Y is nonempty exactly when D reaches the bound below.
  function axisFit(min, max, low, high, tangent) {
    const lowerDepth = Math.max(-high * tangent * depth, 0);
    const upperDepth = Math.min(-low * tangent * depth, 0);
    const required = ((max - min) + lowerDepth - upperDepth) /
      ((high - low) * tangent);
    return {
      required,
      centerAt: distance => (
        min / 2 + max / 2 - (high + low) * tangent * distance / 2 +
        lowerDepth / 2 + upperDepth / 2
      ),
    };
  }

  const horizontal = axisFit(box.min[0], box.max[0], left, right, tanX);
  const vertical = axisFit(box.min[1], box.max[1], bottom, top, tanY);
  // A tiny positive floor also makes flat or point-size bounds safe to view.
  const minimumDistance = Math.max(...size, 1) * 1e-6;
  const frontDistance = Math.max(horizontal.required, vertical.required, minimumDistance);
  const targetZ = box.min[2] / 2 + box.max[2] / 2;
  const cameraZ = box.max[2] + frontDistance;
  const x = horizontal.centerAt(frontDistance);
  const y = vertical.centerAt(frontDistance);
  const distance = cameraZ - targetZ;
  const near = frontDistance / 2;
  const far = (frontDistance + depth) * 1.5;
  if (![x, y, cameraZ, targetZ, distance, near, far].every(Number.isFinite) ||
      cameraZ <= box.max[2] || distance <= 0 || near <= 0 || far <= near) {
    throw new RangeError('Box or projection exceeds supported numeric precision.');
  }
  return { position: [x, y, cameraZ], target: [x, y, targetZ], distance, near, far };
}
