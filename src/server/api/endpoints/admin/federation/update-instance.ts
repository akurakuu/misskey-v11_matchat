import $ from 'cafy';
import define from '../../../define';
import { Instances } from '../../../../../models';
import { toPuny } from '../../../../../misc/convert-host';
import { publishInstanceModUpdated } from '../../../../../services/server-event';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,

	params: {
		host: {
			validator: $.str
		},

		isClosed: {
			validator: $.bool
		},
	}
};

export default define(meta, async (ps, me) => {
	const instance = await Instances.findOne({ host: toPuny(ps.host) });

	if (instance == null) {
		throw new Error('instance not found');
	}

	Instances.update({ host: toPuny(ps.host) }, {
		isMarkedAsClosed: ps.isClosed
	}).then(() => {
		publishInstanceModUpdated();
	});
});
