import { evaluate } from 'mathjs';
export const calculate = async (args) => {
    const expr = String(args.expression ?? '');
    if (!expr)
        return 'No expression provided';
    try {
        // mathjs evaluate is used as a safer alternative to eval. For extra safety,
        // validate the expression or run in a separate sandbox if you allow complex user input.
        const result = evaluate(expr);
        return String(result);
    }
    catch (err) {
        return `Error evaluating expression: ${err.message ?? String(err)}`;
    }
};
