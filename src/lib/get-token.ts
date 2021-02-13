import request from 'superagent';
const config = require('../../config.json');

let token: string | undefined;

export async function getToken(refresh = false) {
    if (token && refresh === false) {
        return token;
    }

    const response = await request.post(`${config.powerwallUrl}/api/login/Basic`)
        .send({
            'username': 'customer',
            'password': config.powerwallPassword,
            "email": config.powerwallEmail,
            "force_sm_off":true,
        })
        .disableTLSCerts()
        .timeout(10000);

    token = response.body.token;

    return token;
}
