import request from 'superagent';

let token: string | undefined;

export async function getToken(refresh = false) {
    if (token && refresh === false) {
        return token;
    }

    const response = await request.post(`${process.env.POWERWALL_URL}/api/login/Basic`)
        .send({
            'username': 'customer',
            'password': process.env.POWERWALL_PASSWORD,
            "email": process.env.POWERWALL_EMAIL,
            "force_sm_off":true,
        })
        .disableTLSCerts()
        .timeout(10000);

    token = response.body.token;

    return token;
}
