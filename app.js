
class Hex {
	/**
	 * @param {bool[]} mask
	 */
	constructor(mask = Array.getFilled(6, false)) {
		this.mask = mask

	}
	/**
	 * @returns {Hex}
	 */
	static makeRandom() {
		return new Hex(Array.getFilled(6, () => Math.random() > 0.5))
	}

	/**
	 * @param {number[]} pos
	 */
	static getTouching(pos) {
		return pos[0] % 2 == 0 ? [
			[0, -1],
			[-1, 0],
			[-1, 1],
			[0, 1],
			[1, 1],
			[1, 0]
		] : [
				[0, -1],
				[-1, -1],
				[-1, 0],
				[0, 1],
				[1, 0],
				[1, -1]
			]
	}

	/**
	 * @returns {boolean}
	 */
	isEmpty() {
		return !(this.mask.sum() > 0)
	}

	/**
	 * @returns {number[][]}
	 */
	getPosibleNeighbours(pos) {
		return Hex.getTouching(pos).filter((v, i) => this.mask[i])
	}

	/**
	 * @returns {Hex}
	 * @param {number[]} pos
	 */
	static makeToFit(pos, canExtend = false) {
		var mask = Array.getFilled(6, false)

		Hex.getTouching(pos).forEach((v, i) => {
			var local = pos.add(v)
			var index = local.join(",")
			if (index in placedHexes) {
				var otherIndex = -1
				Hex.getTouching(local).forEach((v, i) => {
					if (local.add(v).equals(pos)) {
						otherIndex = i
					}
				})
				if (otherIndex < 0) debugger
				if (placedHexes[index].mask[otherIndex] == true) {
					mask[i] = true
				}
			} else if (canExtend) {
				mask[i] = Math.random() > 0.5
			}
		})

		return new Hex(mask)
	}
}

var hexRadius = 100
var genIterations = 2
var ctx = null
/**
 * @type {Object<string,Hex>}
 */
var placedHexes = {}
/**
 * @type {Hex[]}
 */
var storageHexes = []
/** @type {number} */ var selectedHex = null

function setup() {
	ctx = B.canvas.toCtx()
	do {
		placedHexes["0,0"] = Hex.makeRandom()
		for (let it = 0; it < genIterations; it++) {
			let nei = []
			placedHexes.toArray().forEach(v => {
				var pos = v.key.split(",").map(v => parseInt(v))
				v.value.getPosibleNeighbours(pos).forEach(v => {
					v = v.add(pos)
					var string = v.join(",")
					if (nei.indexOf(string) == -1 && !(string in placedHexes)) nei.push(string)
				})
			})
			if (nei.length > 0) {
				nei.forEach(v => {
					var pos = v.split(",").map(v => parseInt(v))
					var newHex = Hex.makeToFit(pos, false)
					placedHexes[v] = Hex.makeToFit(pos, it < genIterations - 1)
				})
			} else {
				break
			}
		}

		var zero = placedHexes["0,0"]
		delete placedHexes["0,0"]
		storageHexes = []
		placedHexes.toArray().forEach(v => {
			storageHexes.push(v.value)
		})

		placedHexes = { "0,0": zero }
	} while (storageHexes.length < 3 || storageHexes.length > 6)
}

function update() {

	hexRadius = Math.floor(window.getSize()[1] / 8)
	if (storageHexes.length <= 0) {
		setup()

		ctx.setColor(colors.green).fill()
		return
	}

	var size = ctx.getSize()
	ctx.setSize(window.getSize())
	ctx.setColor(colors.black).fill()
	ctx.setColor(colors.white).line([hexRadius + 20, 0], [hexRadius + 20, size[1]])
	placedHexes.toArray().forEach((v, i) => {
		var pos = v.key.split(",").map(v => parseInt(v))
		drawHex(transform(pos), v.value)
	})

	storageHexes.forEach((v, i) => {
		var pos = [hexRadius / 2 + 10, hexRadius / 2 + 10 + hexRadius * i]
		if (i == selectedHex) {
			ctx.setColor(colors.green)
			drawHex(pos.add([1, 1]), v)
			ctx.setColor(colors.white)
		}
		drawHex(pos,v)
	})
}

/**
  * @param {number[]} pos
  * @returns {number[]}
  */
function transform(pos) {
	var pos = pos.floor()
	if (pos[0] % 2 == 0) {
		pos[1] += 0.5
	}
	return ctx.getSize().mul(0.5).add(pos.mul(hexRadius).scale([0.75, 0.85])).floor()
}
/**
  * @param {number[]} pos
  * @returns {number[]}
  */
function inverseTransform(pos) {
	var pos = pos.add(ctx.getSize().mul(-0.5)).antiscale([0.75, 0.85]).mul(1 / hexRadius).add([0.5, 0])
	if (pos[0].floor() % 2 != 0) {
		pos[1] += 0.5
	}
	return pos.floor()
}

/**
 * @param {number[]} pos
 * @param {Hex} hex
 */
function drawHex(pos, hex) {
	var angles = (Math.PI * 2).segment(6)
	angles.map((v) => vector.fromAngle(v + Math.PI / 2).mul(hexRadius / 2).add(pos)).forEach((v, i, a) => {
		ctx.line(v, a[(i + 1) % a.length])
		if (hex.mask[i]) {
			ctx.line(pos, v.add(a[(i + 1) % a.length]).mul(0.5))
		}
	})

}

/**
 * @param {MouseEvent} event
 */
function down(event) {
	var screenPos = event.getPos()
	if (screenPos[0] < 20 + hexRadius) {
		var index = Math.floor((screenPos[1]) / (hexRadius))
		if (selectedHex == index) selectedHex = null
		else if (index >= storageHexes.length) selectedHex = null
		else selectedHex = index
	} else {
		var pos = inverseTransform(event.getPos())
		if (selectedHex == null) {
			if (!pos.equals([0, 0]) && pos.join(",") in placedHexes) {
				var hex = placedHexes[pos.join(",")]
				delete placedHexes[pos.join(",")]
				storageHexes.push(hex)
			}
		} else {
			var newHex = Hex.makeToFit(pos, false)
			if (!newHex.isEmpty()) {
				var selHex = storageHexes[selectedHex]
				var matches = true
				newHex.mask.forEach((v, i) => {
					if (v && !selHex.mask[i]) matches = false
				})

				if (matches) {
					placedHexes[pos.join(",")] = selHex
					storageHexes.splice(selectedHex, 1)
					selectedHex = null
				}
			}
		}
	}
}